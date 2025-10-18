from fastapi                                  import HTTPException
from typing                                   import List, Dict
from collections                              import Counter
import logging
import chromadb
import os
from langchain_huggingface                    import HuggingFaceEmbeddings
# from FlagEmbedding                            import FlagReranker
from langchain_chroma                         import Chroma
from hazm                                     import Normalizer
import re
import logging

# Disable PostHog analytics to prevent connection errors
os.environ["ANONYMIZED_TELEMETRY"] = "False"
chromadb.Settings.anonymized_telemetry = False

logger = logging.getLogger(__name__)
# models
embedding_model = HuggingFaceEmbeddings(
                model_name='/app/saved_models/information_retrieval/25540/',
                model_kwargs={"device": 'cpu'},#config_dict["embedding_model"]["device"]}
                encode_kwargs = {'normalize_embeddings': True} # set True to compute cosine similarity
            )
# Commented out FlagReranker as it's not needed
# reranker_model = FlagReranker(
#                '/app/saved_models/models--BAAI--bge-reranker-v2-m3/snapshots/12e974610ba9083ed95f3edf08d7e899581f4de4',
#                use_fp16 = True,
#                device='cpu'  # Changed from 'cuda' to 'cpu' for Docker compatibility
#            )
vectordb = Chroma(
                persist_directory='/app/VectorDB/',
                embedding_function=embedding_model,
                collection_metadata={"hnsw:space": "cosine"}  # Set the distance metric to cosine
                # collection_metadata={
                #     "hnsw:space": "cosine",
                #     "hnsw:M": 32,
                #     "hnsw:search_ef": 200,
                #     "hnsw:construction_ef": 600,
                #     "hnsw:num_threads": 4,
                #     "hnsw:resize_factor": 1.5
                # },
            )
# retriever = vectordb.as_retriever(search_kwargs={"k":10})  # Using hardcoded value instead of config_dict


def replace_arabic_to_persian(text):
    # Replace Arabic characters with Persian characters
    arabic_to_persian = {
        'ك': 'ک',
        'ؤ': 'و',
        'ئ': 'ی',
        'ي': 'ی',
        'ة': 'ه'
    }
    for arabic_char, persian_char in arabic_to_persian.items():
        text = text.replace(arabic_char, persian_char)
    return text

def clean_text(text):
    # remove multiple spaces with just one space 
    text = re.sub(' +', ' ', text)
    # Remove line breaks
    text = text.replace('\n', ' ')
    text = text.replace('..', '.')
    text = re.sub(r'\\n\\n', ' ', text)
    text = re.sub(r"[" + 'ّ'  + 'ٌ' + 'ـ' + 'َ' + '؟' + '?' + '»' + '«' + 'ِ' + 'ٕ'  + 'ٍ' + 'ُ' + 'ْ' + "]", '', text)
    return text

def normalize_persian_text(input_text): 
    normalizer = Normalizer()   
    normalized_text = normalizer.normalize(input_text)
    normalized_text = replace_arabic_to_persian(normalized_text)
    normalized_text = clean_text(normalized_text)
    return normalized_text

def format_context(documents: List) -> str:
    """Formats context text for output, handling remaining word count."""
    context_list = []
    for doc in documents:
        context_text = (
            f"{doc.page_content} \n"
            f"domain: {doc.metadata['domain']} \n"
            # f"لینک دانش: {add_href_prefix(doc.metadata['link_solution'], doc.metadata['title'])} \n\n"
            f"detailed_solution: {doc.metadata['detailed_solution']}"
        )
        context_list.append(context_text)
    # return ''.join([f'{i}. "context_{i}": {context_list[i]} \n\n' for i in range(len(context_list))])
    # reverse order
    return ''.join([f'### {len(context_list)-1-i}. context_{len(context_list)-1-i}: \n{context_list[len(context_list)-1-i]} \n\n\n' for i in range(len(context_list))])


def get_unique_documents(documents: List) -> List:
    """Removes duplicate documents based on title, keeping only the highest scoring version."""
    unique_docs = {}
    
    for doc in documents:
        title = doc.metadata['knowledge_number']
        score = doc.metadata.get('score', 0)  # Default to 0 if score is missing
        
        # If we haven't seen this title yet, or this document has a higher score
        if title not in unique_docs or score > unique_docs[title][1]:
            unique_docs[title] = (doc, score)
    
    # Extract just the documents from our dictionary values
    return [doc_score_tuple[0] for doc_score_tuple in unique_docs.values()]

# Define SPECIAL_TITLE_LIST since it's referenced but not defined
SPECIAL_TITLE_LIST = ["Greeting", "Gratitude", "call_me_back"]

def find_obvious_answer(documents: List, titles: List, query_is_abstract: str, query: str, high_score: float) -> str:
    """Determines if there is an obvious answer based on title frequency."""
    title_frequency = Counter(titles)
    most_common_title, freq = title_frequency.most_common(1)[0]
    yes_no_list = ['بله','خیر','اره','نه','آره']

    # check if the query is a single word then return a text, elif is a two word and lower score than 0.7 then return a static text, otherwise check for obvious answer
    if len(query.split(' ')) == 1 \
            and query not in yes_no_list \
            and ((most_common_title not in SPECIAL_TITLE_LIST) \
            or  (most_common_title in SPECIAL_TITLE_LIST and high_score < 0.7)):
        return 'چت بات قادر به پاسخ به سوالات تک کلمه ای نیست. لطفا سوال خود را با جزییات بیشتر مطرح کنید.'
   
    if (not query_is_abstract) and (freq / len(titles) >= 0.4):
        doc = documents[0]
        detailed_solution = doc.metadata['detailed_solution']
        # link_solution = add_href_prefix(doc.metadata['link_solution'], doc.metadata['title'])
        if most_common_title in ["Greeting", "Gratitude", "call_me_back"]:
            return detailed_solution
        return f'#### پاسخ کامل: \n{detailed_solution}'

    return '----'

def rerank_documents(query: str, documents: List) -> List:
    """Reranks the documents based on reranker scores, filters by threshold, and sorts by score."""
    # Commented out FlagReranker functionality
    # try:
    #     scores = reranker_model.compute_score([[query, doc.page_content] for doc in documents], normalize=True)
    #     documents_with_scores = list(zip(documents, scores))
    #     alpha_threshold = 0.001
    #     filtered_documents = [(doc, score) for doc, score in documents_with_scores if score > alpha_threshold]
    #     sorted_filtered_documents_with_scores  = sorted(filtered_documents, key=lambda x: x[1], reverse=True)[:10]
    #     return [doc for doc, _ in sorted_filtered_documents_with_scores]
    # except Exception as e:
    #     logging.error(f"Error occurred in reranker: {str(e)}")
    #     raise HTTPException(status_code=500, detail="RAG chatbot process failed")
    
    # Simply return the top 10 documents without reranking
    return documents[:10]


def retrieve_documents(query: str) -> List:
    """Retrieves top-k similar documents and adds relevance scores to metadata."""
    documents = vectordb.similarity_search_with_relevance_scores(query, k=50)
    for doc, score in documents:
        doc.metadata['score'] = score  # Add score to the document's metadata
    updated_docs = [doc for doc, _ in documents]

    return updated_docs

def information_retrieve(text_request):
    """ 
    curl -X POST http://localhost:8099/rag/retrieve/ -H "Content-Type: application/json" -d "{\"text\": \"سلام خوبی؟\"}"
    """
    query = normalize_persian_text(text_request)

    try:
        initial_documents = retrieve_documents(query)
        query_is_abstract = True

        print('retrieve is complete')
        # Reranking is already commented out
        # reranked_documents = rerank_documents(query, initial_documents)  
        # print('reranking is complete') 
        if len(initial_documents) == 0:
            return {
                'context': '',
                'top_10_context':[],
                'domain': ["-1"],  # yani out of domain
                'query_is_abstract': True,
                'obvious_answer':' پاسخ شما را نمیدانم لطفا راجع به ماژول های سپیدار سیستم بپرسید',
            }         
        ## apply this rule that if the highest score of the context is less than low_threshold then return empty context for llm to  answer:
        high_score = initial_documents[0].metadata.get('score', 1)
        logger.warning(f'\n********************************** high_score: {high_score}')
        if high_score < 0.01:
            # If the highest score is below low_threshold, return empty context
            print('now returning the result')
            return {
                'context': '',
                'top_10_context': [],
                'domain': "-1",  # yani out of domain
                'query_is_abstract': True,
                'obvious_answer': '----',
            }
        elif high_score >= 0.79:
            query_is_abstract = False
                
        
        
        titles = [doc.page_content for doc in initial_documents]
        obvious_answer = find_obvious_answer(initial_documents, titles, query_is_abstract, query, high_score)
        ### Get unique documents
        unique_rerank_documents = get_unique_documents(initial_documents)
        unique_rerank_documents = unique_rerank_documents[:15]
        context = format_context(unique_rerank_documents)
        top_10_context = [{'kn':doc.metadata['knowledge_number'], 'problem':doc.page_content.split("problem:", 1)[-1].strip()} for doc in unique_rerank_documents]
        domain_mode = Counter([doc.metadata['domain'] for doc in unique_rerank_documents]).most_common(1)[0][0]
        return {
            'context': context,
            'top_10_context': top_10_context,
            'domain': domain_mode,
            'query_is_abstract': query_is_abstract,
            'obvious_answer': obvious_answer,
        }

    except Exception as e:
        logging.error(f"Error occurred during rag_chatbot process: {str(e)}")
        raise HTTPException(status_code=500, detail="RAG chatbot process failed")