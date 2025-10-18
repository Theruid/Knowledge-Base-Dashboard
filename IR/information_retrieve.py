from kserve_deployment.kserve_client                import SentenceTransformerKServeAdapter, RerankerKServeAdapter

import logging
import os

logger = logging.getLogger(__name__)

class IRStrategy(ABC):
    """Abstract base class for information retrieval strategies."""
    
    def __init__(self, customer_id: str, config: Dict):
        """Initialize the IR strategy.
        
        Args:
            customer_id: The customer ID for this strategy
            config: Configuration dictionary with strategy settings
        """
        self.customer_id = customer_id
        self.config = config
        self.config_manager = ConfigManager()
        self.vector_db = None
        self.reranker = None
        self._initialized = False
        self.yes_no_list = ['بله','خیر','اره','نه','آره']
        self.special_title_list = ["Greeting", "Gratitude", "call_me_back","Ticket", "Subscription"]
        self._get_embedding_model()

    def _get_embedding_model(self):
        """Initialize and return the embedding model."""
        model_name = self.config.get("ir_retrieval", {}).get("model_name")
        device = self.config.get("ir_retrieval", {}).get("device", "cpu")
            
        try:
            # Check if we should use KServe
            use_kserve = self.config.get("ir_retrieval", {}).get("use_kserve", False)
            
            if use_kserve:
                # Use the KServe adapter
                self.model = SentenceTransformerKServeAdapter(
                    retriever_config=self.config.get("ir_retrieval", {}),
                    model_name=model_name,
                    device=device,
                    normalize_embeddings=True
                )
                logger.info(f"Connected to KServe sentence transformer model: {model_name}")
            else:
                # Fall back to local model if KServe is not enabled
                # from sentence_transformers import SentenceTransformer
                # self.model = SentenceTransformer(
                #     model_name,
                #     device=device,
                #     trust_remote_code=False
                #     )
                from langchain_huggingface import HuggingFaceEmbeddings
                model_kwargs = {"device": device, "trust_remote_code": False }
        
                encode_kwargs = {
                    'normalize_embeddings': True,  # Essential for cosine similarity
                    'batch_size': 32,  # Adjust based on GPU memory
                    'convert_to_tensor': True,
                    'precision': 'float32'  
                    }

                self.model = HuggingFaceEmbeddings(
                    model_name=model_name,
                    model_kwargs= model_kwargs,
                    encode_kwargs= encode_kwargs
                )

                # self.model = HuggingFaceEmbeddings(
                #     model_name=model_name,
                #     model_kwargs= model_kwargs,
                #     encode_kwargs = encode_kwargs # set True to compute cosine similarity
                #     )
                logger.info(f"Loaded local sentence transformer model: {model_name}")
                
        except Exception as e:
            logger.error(f"Failed to load sentence transformer model: {str(e)}")
            raise

    def get_query_embedding(self, query: str) -> List[float]:
        """Generate embedding for a query string."""
        if self.model is None:
            self._get_embedding_model()

        return self.model.embed_query(query)  # prompt_name="Retrieval-query"
        # query_embedding = self.model.encode(
        #     f"query: {query}", 
        #     normalize_embeddings=True,
        #     convert_to_tensor=False
        # )
        # return query_embedding
    
    def get_document_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of text documents."""
        if self.model is None:
            self._get_embedding_model()
        
        return self.model.embed_documents(texts)  
        
    def initialize(self) -> None:
        """Initialize strategy components asynchronously with thread safety."""
        if self._initialized:
            return

        # Initialize vector vector_db
        self.vector_db = self._initialize_vector_db()
        # Initialize reranker if configured
        if self.config.get("reranker", {}).get("enabled", True):
            self.reranker = self._initialize_reranker()
            
        self._initialized = True
        # logger.info(f"Initialized {self.__class__.__name__} for customer {self.customer_id}")

    
    def _initialize_vector_db(self) -> SimilaritySearcher:
        """Initialize the vector vector_db manager."""
        self.db_type = self.config.get("vector_db", {}).get("type")
        enable_book = self.config.get("vector_db", {}).get("enable_book", False)
        logger.info(f"Creating similarity searcher of type '{self.db_type}' for collection: {self.customer_id}")
    
        # Create directory structure
        base_dir = os.path.join('./vectordb', self.customer_id)
        if enable_book:
            persist_dir = os.path.join(base_dir, self.config["vector_db"]["persist_directory_books"])
        else:
            persist_dir = os.path.join(base_dir, self.config["vector_db"]["persist_directory_faq"])
        logger.info(f"Using persist directory: {persist_dir}")
        
        vector_db = SimilaritySearcherFactory.create_similarity_searcher(
            config=self.config,
            customer_id=self.customer_id,
            persist_directory=persist_dir
            )
        return vector_db

      
    def _initialize_reranker(self):
        """
        Initialize the reranker model.
        
        Returns:
            Optional[RerankerKServeAdapter]: Initialized reranker model or None if disabled
            
        Raises:
            RerankingError: If reranker initialization fails
        """
        # try:
        reranking_config = self.config.get("reranker", {})
        if not reranking_config.get("enabled", True):
            logger.info("Reranking is disabled in config")
            return None
            
        model_name = reranking_config.get("model_name")
        use_kserve = reranking_config.get("use_kserve", True)
        device = reranking_config.get("device", "cuda")
        
        if use_kserve:
            # Use the KServe adapter
            reranker = RerankerKServeAdapter(
                reranker_config=reranking_config,
                model_name=model_name,
                device=device,
                normalize_embeddings=True
            )
            logger.info(f"Connected to KServe reranker model: {model_name}")
        else:
            from FlagEmbedding import FlagReranker
            reranker = FlagReranker(model_name, use_fp16=True, device= device)
            logger.info(f"Loaded local reranker model: {model_name}")
        return reranker

        # except Exception as e:
        #     logger.error(f"Failed to initialize reranker: {str(e)}")
        #     raise RerankingError(f"Failed to initialize reranker: {str(e)}") from e
    
    async def retrieve_documents(self, query: str, include_books_db: bool) -> List:
        """Retrieve documents from main and books DB if requested"""
        query_embedding = self.get_query_embedding(query)
        main_docs = await self.vector_db.similarity_search_with_score(query_embedding, k=self.config["ir_retrieval"]["retrieved_documents"])
        
        for doc, score in main_docs:
            doc.metadata['score'] = score  # Add score to the document's metadata
        main_docs = [doc for doc, _ in main_docs]
        
        books_docs = []
        if include_books_db and self.config['vector_db'].get("enable_book", False):
            query_embedding = self.get_query_embedding(query)
            books_docs = await self.vector_db.similarity_search_with_score(query_embedding, k=self.config["ir_retrieval"]["retrieved_books"])
            # books_docs = await self.vector_db.similarity_search_with_score_books(query, k=self.config["ir_retrieval"]["retrieved_books"])

            for doc, score in books_docs:
                doc.metadata['score'] = score  # Add score to the document's metadata
            books_docs = [doc for doc, _ in books_docs]
        
        return main_docs, books_docs
        
    def rerank_documents(self, query: str, documents: List) -> List:
        """Rerank documents using the reranker model"""
        if not documents or not self.reranker:
            return documents, [0] * len(documents)

        # Prepare query-document pairs
        pairs = [[query, doc.page_content] for doc in documents]
        # scores =  self.reranker.predict(pairs, convert_to_numpy=True)
        scores = self.reranker.compute_score(pairs, normalize=True)
        documents_with_scores = list(zip(documents, scores))
        # Filter by threshold and sort
        alpha_threshold = self.config["ir_retrieval"]["alpha_threshold"]
        filtered_documents = [(doc, score) for doc, score in documents_with_scores if score > alpha_threshold]
        sorted_filtered_documents_with_scores  = sorted(filtered_documents, key=lambda x: x[1], reverse=True)[:self.config['reranker']['cutoff']]
        return [doc for doc, _ in sorted_filtered_documents_with_scores], [score for _,score in sorted_filtered_documents_with_scores]
  
    
    def _get_domains(self, documents: List) -> str:
        if 'domain' not in documents[0].metadata:
            return []
        domain_mode = Counter([doc.metadata['domain'] for doc in documents]).most_common(1)[0][0]
        return [domain_mode]

    def _get_top_10_context(self, documents: List) -> List:
        doc_metadata_cluster = self.config['dataset']['fields']['knowledge_number']['label']
        return [{'kn':doc.metadata[doc_metadata_cluster],
                'problem':doc.page_content.split("problem:", 1)[-1].strip()
                }
                for doc in documents]

    async def get_unique_documents(self, documents: List) -> List:
        """Removes duplicate documents based on title, keeping only the highest scoring version."""
        unique_docs = {}
        
        for doc in documents:
            knowledge_number = doc.metadata['knowledge_number']
            score = doc.metadata.get('score', 0)  # Default to 0 if score is missing
            
            # If we haven't seen this title yet, or this document has a higher score
            if knowledge_number not in unique_docs or score > unique_docs[knowledge_number][1]:
                unique_docs[knowledge_number] = (doc, score)
        # Extract just the documents from our dictionary values
        return [doc_score_tuple for doc_score_tuple in unique_docs.values()]

    def _get_document_format_config(self) -> Dict:
        """
        Gets the document format configuration for the current customer.
        This method reads the customer-specific configuration for document formatting.
        
        Returns:
            Dictionary with metadata field configurations and formatting options
        """
        # Default document format configuration
        default_format = {
            # Required fields - must be present in all documents
            "required_fields": ["page_content"],
            
            # Optional fields with default values if missing
            "optional_fields": {
                "domain": "N/A",
                "detailed_solution": "No detailed solution available",
                "link_solution": "",
                "title": ""
            },
            
            # Field display configuration
            "display_fields": [
                {"field": "domain", "label": "domain", "format": "{label}: {value}"},
                {"field": "detailed_solution", "label": "detailed_solution", "format": "{label}: {value}"}
            ],
            
            # Special formatting for linked fields
            "linked_fields": [
                {
                    "enabled": False,  # Disabled by default
                    "field": "link_solution", 
                    "label": "لینک دانش", 
                    "link_with": "title",
                    "format": "{label}: {linked_value}"
                }
            ]
        }
        
        # Read dataset field configuration from the config file
        if "dataset" in self.config:
            dataset_config = self.config["dataset"]
            
            # Configure required fields if specified
            if "required_fields" in dataset_config:
                default_format["required_fields"] = dataset_config["required_fields"]
            
            # Configure optional fields with their defaults
            if "fields" in dataset_config:
                for field, properties in dataset_config["fields"].items():
                    if "default" in properties:
                        default_format["optional_fields"][field] = properties["default"]
                    else:
                        default_format["optional_fields"][field] = ""
                        
                # Build display fields configuration based on dataset fields
                display_fields = []
                for field, properties in dataset_config["fields"].items():
                    if properties.get("display", True):
                        display_config = {
                            "field": field,
                            "label": properties.get("label", field),
                            "format": properties.get("format", "{label}: {value}")
                        }
                        display_fields.append(display_config)
                        
                if display_fields:
                    default_format["display_fields"] = display_fields
                    
                # Configure linked fields if any
                linked_fields = []
                for field, properties in dataset_config["fields"].items():
                    if "link_with" in properties:
                        linked_config = {
                            "enabled": properties.get("enabled", True),
                            "field": field,
                            "label": properties.get("label", field),
                            "link_with": properties["link_with"],
                            "format": properties.get("format", "{label}: {linked_value}")
                        }
                        linked_fields.append(linked_config)
                        
                if linked_fields:
                    default_format["linked_fields"] = linked_fields
        
        # Check if customer configuration has document_format section (for backward compatibility)
        if "document_format" in self.config:
            customer_format = self.config["document_format"]
            
            # Override defaults with customer-specific settings where provided
            if "required_fields" in customer_format:
                default_format["required_fields"] = customer_format["required_fields"]
                
            if "optional_fields" in customer_format:
                default_format["optional_fields"].update(customer_format["optional_fields"])
                
            if "display_fields" in customer_format:
                default_format["display_fields"] = customer_format["display_fields"]
                
            if "linked_fields" in customer_format:
                default_format["linked_fields"] = customer_format["linked_fields"]
        
        return default_format

    def _format_context(self, documents: List) -> str:
        """
        Formats context text for output, calling manage_context_size for each document to ensure token limits are respected.
        Handles different metadata schemas for different customers.
        
        Args:
            documents: List of document objects with page_content and metadata        
        Returns:
            Formatted context string that fits within the context limit
        """
        # Get customer-specific document format configuration
        doc_format = self._get_document_format_config()
        
        # Use a running context that gets updated for each document
        running_context = ""
        context_list = []
        
        for i, doc in enumerate(documents):
            # Start with page content
            doc_parts = [f"{doc.page_content} \n"]
            
            # Add regular display fields
            for field_config in doc_format["display_fields"]:
                field_name = field_config["field"]
                label = field_config["label"]
                format_str = field_config["format"]
                
                # Get field value with fallback to default if missing
                if field_name in doc.metadata:
                    value = doc.metadata[field_name]
                else:
                    # Use default from optional fields if defined
                    value = doc_format["optional_fields"].get(field_name, "")
                
                # Format and add to parts
                field_text = format_str.format(label=label, value=value)
                doc_parts.append(field_text)
            
            # Add linked fields (like links with titles)
            for linked_config in doc_format["linked_fields"]:
                if linked_config.get("enabled", False):
                    field_name = linked_config["field"]
                    link_with = linked_config["link_with"]
                    label = linked_config["label"]
                    format_str = linked_config["format"]
                    
                    if field_name in doc.metadata and link_with in doc.metadata:
                        linked_value = add_href_prefix(doc.metadata[field_name], doc.metadata[link_with])
                        field_text = format_str.format(label=label, value=linked_value)
                        doc_parts.append(field_text)
            
            # Join all parts into document text
            doc_text = " \n".join(doc_parts)
            
            # Create a temporary context that includes all documents so far plus the new one
            temp_context = running_context + doc_text
            max_model_len = self.config["vllm"]["max-model-len"]
            # Use manage_context_size to check if adding this document would exceed token limits
            # Get customer-specific prompt
            rag_system_prompt = self.config_manager.get_prompt(self.customer_id, 'RAG_SYSTEM_PROMPT')
            tiktoken_cache_dir = self.config['context_size']['tiktoken_cache_dir']
            managed_context, _ = manage_context_size(context=temp_context, system_prompt=rag_system_prompt, max_tokens=max_model_len, tiktoken_cache_dir=tiktoken_cache_dir)
            
            # If manage_context_size returns the full temp_context, we can add this document, If it returns something shorter, we've reached the limit
            if len(managed_context) == len(temp_context):
                # Document fits within token limits, add it
                context_list.append(doc_text)
                running_context = temp_context
            else:
                # We've reached token limit - check if we can add a truncated version
                if i == 0 or len(managed_context) > len(running_context):
                    # Either this is the first document or we have space for a truncation
                    # Get the truncated document text
                    truncated_doc = managed_context[len(running_context):]
                    if truncated_doc:  # Only add if we have meaningful content
                        context_list.append(truncated_doc)
                break  # Stop adding documents
        
        # Format the final context with reverse ordering (most recent first)
        formatted_context = ''.join([
            f'### {len(context_list)-1-i}. context_{len(context_list)-1-i}: \n{context_list[len(context_list)-1-i]} \n\n\n' for i in range(len(context_list))
        ])
        
        # Double-check the final formatted context with manage_context_size
        # Get customer-specific prompt
        rag_system_prompt = self.config_manager.get_prompt(self.customer_id, 'RAG_SYSTEM_PROMPT')
        final_context, _ = manage_context_size(
            context=formatted_context,
            question=None,
            history=None,
            system_prompt=rag_system_prompt,
            max_tokens=max_model_len,
            tiktoken_cache_dir=tiktoken_cache_dir
        )
        return final_context

    def _find_obvious_is_abstract(self, documents: List, query: str) -> str:
        """Determines if there is an obvious answer based on title frequency."""
        query_is_abstract = True
        highest_score = max(doc.metadata.get('score', 0) for doc in documents)
        doc_with_highest_score = max(documents, key=lambda doc: doc.metadata.get('score', 0))
        # highest_score = documents[0].metadata.get('score', 1)

        if len(documents) == 0 or highest_score < self.config["ir_retrieval"]["lower_threshold"]:
            obvious_answer = self.config_manager.get_prompt(self.customer_id, 'fake_answer')
            return obvious_answer, query_is_abstract
       
        elif highest_score >= self.config["ir_retrieval"]["upper_threshold"]:
            query_is_abstract = False     
        
        print(f"************************* highest_score: {highest_score} and query_is_abstract: {query_is_abstract}")
        if "cluster_name" not in self.config["dataset"]["fields"]:
            cluster_name = "knowledge_number"
        else:
            cluster_name = self.config["dataset"]["fields"]["cluster_name"]["label"]
        titles = [doc.metadata[cluster_name] for doc in documents]
        title_frequency = Counter(titles)
        most_common_title, freq = title_frequency.most_common(1)[0]
        problem_with_highest_score = doc_with_highest_score.page_content
        print(f"freq: {freq}, title: {len(titles)} most_common_title: {most_common_title}")

        # check if the query is a single word then return a text, elif is a two word and lower score than 0.7 then return a static text, otherwise check for obvious answer
        if len(query.split(' ')) == 1 \
                and query not in self.yes_no_list \
                and ((problem_with_highest_score not in self.special_title_list) \
                or  (problem_with_highest_score in self.special_title_list and highest_score < self.config["ir_retrieval"]["min_word_threshold"])):
            obvious_answer =  'چت بات قادر به پاسخ به سوالات تک کلمه ای نیست. لطفا سوال خود را با جزییات بیشتر مطرح کنید.'
            return obvious_answer, query_is_abstract
        
        elif len(query.split(' ')) < self.config["ir_retrieval"]["word_min_limit"] \
                and (problem_with_highest_score not in self.special_title_list) \
                and (highest_score <= self.config["ir_retrieval"]["min_word_threshold"]):
            obvious_answer = 'سوال شما مبهم است. لطفاً با ارائه جزئیات بیشتر، به من کمک کنید تا بهتر بتوانم به شما پاسخ دهم.'
            return obvious_answer, query_is_abstract
        
        # Return detailed solution for obvious answer
        if (not query_is_abstract and freq / len(titles) >= self.config["ir_retrieval"]["obvious_answer_threshold"]) \
            or (highest_score >= 0.95 ) \
            or (problem_with_highest_score in self.special_title_list and freq / len(titles) >= self.config["ir_retrieval"]["obvious_answer_threshold"]) \
            or (problem_with_highest_score in self.special_title_list and not query_is_abstract):
            
            detailed_solution = doc_with_highest_score.metadata['detailed_solution']
            if 'link_solution' not in doc_with_highest_score.metadata:
                link_solution = 'no_link_solution_yet'
            else:
                link_solution = add_href_prefix(doc_with_highest_score.metadata['link_solution'], doc_with_highest_score.metadata['title'])
            if problem_with_highest_score in self.special_title_list or link_solution=='no_link_solution_yet':
                return detailed_solution, query_is_abstract
            return f'{link_solution} \n\n{detailed_solution}', query_is_abstract

        return '----', query_is_abstract


    async def process_request(self, request: IRRequest) -> Dict:
        pass
        


class StandardIRStrategy(IRStrategy):
    """Standard retrieval strategy with basic document retrieval."""
    async def process_request(self, request: IRRequest) -> Dict:
        """Process a standard retrieval request.
        Args:
            request: The IR request containing query and parameters
        Returns:
            Dict containing the retrieval results
        Raises:
            DocumentRetrievalError: If document retrieval fails
        """
        query = normalize_persian_text(request.text)
        # Get base documents
        faq_documents, books_documents = await self.retrieve_documents(query, request.include_books_db)
        # Combine, rerank and process
        all_docs = faq_documents + books_documents

        if self.config["reranker"]["enable"]:
            reranked_docs, reranked_scores = self.rerank_documents(query, all_docs)

            if len(reranked_docs) == 0:
                fallback = self.config_manager.get_prompt(self.customer_id, 'fake_answer')
                return {
                    'context': '',
                    'top_10_context':[],
                    'domain': ["-1"],  # yani out of domain
                    'query_is_abstract': True,
                    'obvious_answer': fallback,
                    'response': fallback
                }  
            final_documents = reranked_docs
        else:
            final_documents = all_docs 
            reranked_scores = [0] * len(final_documents)

        obvious_answer, query_is_abstract = self._find_obvious_is_abstract(final_documents, query)
        print(f"\nobvious_answer ::{obvious_answer}")
        ### Get unique documents
        unique_documents = await self.get_unique_documents(final_documents)
        unique_documents = sorted(unique_documents, key=lambda x: x[1], reverse=True)[:self.config['reranker']['select_uniqued_context']]
        unique_documents = [doc for doc, _ in unique_documents]

        # Format context
        context = self._format_context(unique_documents)
        for doc in unique_documents:
            print(f"problem: {doc.page_content} score:{doc.metadata.get('score')} kn: {doc.metadata.get('knowledge_number')}")

        return {
            'context': context,
            'top_10_context': self._get_top_10_context(unique_documents),
            'domain': self._get_domains(unique_documents),
            'query_is_abstract': query_is_abstract,
            'obvious_answer': obvious_answer,
            'response': None if obvious_answer == '----' else obvious_answer
        }
