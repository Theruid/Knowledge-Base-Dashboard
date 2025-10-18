"""KServe Client Module
Provides simple and efficient interfaces for communicating with KServe-deployed models. Optimized for performance in RAG pipeline where functions are called per query.
"""
import requests
import logging
import os
import torch
import numpy as np
import torch
from typing                                 import List, Union
from transformers                           import AutoTokenizer
from pathlib                                import Path

project_root = Path(__file__).parent.parent.parent

logger = logging.getLogger(__name__)
logging.info(project_root, "*********************************************************** !!!!")

TOKENS_PATH = 'ir_service/kserve_deployment/.cache/'
os.environ['HF_HOME'] = TOKENS_PATH
os.environ['HF_HUB_OFFLINE'] = '1'  # Ensures completely offline use

class KServeEmbeddingClient:
    """Simple client for KServe embedding models"""
    
    def __init__(self, kserve_endpoint: str, kserve_path: str, model_name: str):
        self.endpoint = f"{kserve_endpoint}{kserve_path}"
        # Set the cache directory to your desired local path
        e5_tokens_path = os.path.join(TOKENS_PATH, 'models--intfloat--multilingual-e5-base/snapshots')
        self.tokenizer = AutoTokenizer.from_pretrained(os.path.join(project_root,e5_tokens_path), local_files_only=True)
        logger.info(f"Initialized KServe embedding client: {self.endpoint}")
        print(f" ************************** {self.endpoint} *******************************")
    
    @staticmethod
    def average_pool(last_hidden_states: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        last_hidden = last_hidden_states.masked_fill(~attention_mask[..., None].bool(), 0.0)
        return last_hidden.sum(dim=1) / attention_mask.sum(dim=1)[..., None]

    @staticmethod
    def average_pool_numpy(last_hidden_states: np.ndarray, attention_mask: np.ndarray) -> np.ndarray:
        """NumPy version of average pooling with attention mask"""
        # Convert attention mask to boolean and add dimension for broadcasting
        mask_bool = attention_mask.astype(bool)
        mask_expanded = mask_bool[..., None]  # [batch_size, seq_len, 1]
        
        # Apply mask to hidden states (set masked positions to 0)
        masked_hidden = np.where(mask_expanded, last_hidden_states, 0.0)
        
        # Sum along sequence dimension
        summed = np.sum(masked_hidden, axis=1)  # [batch_size, hidden_dim]
        
        # Calculate the number of valid tokens for each sequence
        valid_tokens = np.sum(attention_mask, axis=1, keepdims=True)  # [batch_size, 1]
        valid_tokens = np.maximum(valid_tokens, 1e-9)  # Prevent division by zero
        
        # Average by dividing by number of valid tokens
        averaged = summed / valid_tokens
        return averaged

    
    def embed_query(self, texts, text_type="query", normalize=True, max_length=512):
        """Get embeddings from KServe model with tokenization"""
        if isinstance(texts, str):
            texts = [texts]
        
        # Tokenize the texts first
        input_ids_batch = []
        attention_mask_batch= []
        for text in texts:
            print("text", text)
            # Add prefix to text
            prefixed_text = text
            # prefixed_text = f"{text_type}: {text}"
            
            # Tokenize the text
            encoded = self.tokenizer(
                prefixed_text,
                padding='max_length',
                truncation=True,
                max_length=max_length,
                return_tensors="np"  # Return numpy arrays instead of tensors
            )
            
            input_ids_batch.append(encoded["input_ids"][0])  # Remove batch dimension
            attention_mask_batch.append(encoded["attention_mask"][0])
        
        # Convert to numpy arrays with shape [batch_size, seq_length]
        input_ids_np = np.array(input_ids_batch, dtype=np.int64)
        attention_mask_np = np.array(attention_mask_batch, dtype=np.int64)

        print(f"Input IDs shape: {input_ids_np.shape} and Attention mask shape: {attention_mask_np.shape}")

        # Prepare the input data for KServe
        input_ids = {
            "name": "input_ids",
            "shape": list(input_ids_np.shape),  # e.g., [2, 8]
            "datatype": "INT64",
            "data": input_ids_np.flatten().tolist()  # Flatten to 1D list
        }

        attention_mask = {
            "name": "attention_mask", 
            "shape": list(attention_mask_np.shape),  # e.g., [2, 8]
            "datatype": "INT64",
            "data": attention_mask_np.flatten().tolist()  # Flatten to 1D list
        }

        # Create the final data structure
        data = {"inputs": [input_ids, attention_mask]}
        
        response = requests.post(self.endpoint, json=data, verify=False)
        response.raise_for_status()
        response_json = response.json()
        # --- UPDATED PARSING FOR NEW OUTPUT FORMAT ---
        # Extract the main embeddings (shape [2, 768])
        embeddings_output = next(out for out in response_json["outputs"] if out["name"] == "1680")
        batch_embeddings = np.array(embeddings_output["data"]).reshape(embeddings_output["shape"])

        # # Optional: Extract hidden states if needed (shape [2, 8, 768])
        hidden_states_output = next(out for out in response_json["outputs"] if out["name"] == "last_hidden_state")
        hidden_states = np.array(hidden_states_output["data"]).reshape(hidden_states_output["shape"])
        print(f"Hidden states shape: {hidden_states.shape}") 

        pooled_embeddings = self.average_pool_numpy(hidden_states, attention_mask_np)
        
        if normalize:
            # L2 normalization
            norms = np.linalg.norm(pooled_embeddings, ord=2, axis=-1, keepdims=True)
            norms = np.maximum(norms, 1e-12)  # Prevent division by zero
            final_embeddings = pooled_embeddings / norms
        else:
            final_embeddings = pooled_embeddings

        # Return format
        if final_embeddings.shape[0] == 1:
            return final_embeddings.flatten().tolist()
        else:
            return final_embeddings.tolist()

        

class KServeRerankerClient:
    """Simple client for KServe reranker models"""
    
    def __init__(self, kserve_endpoint: str, kserve_path: str):
        self.endpoint = f"{kserve_endpoint}{kserve_path}"
        bge_tokens_path = os.path.join(TOKENS_PATH, 'bge')
        self.tokenizer = AutoTokenizer.from_pretrained(os.path.join(project_root, bge_tokens_path), local_files_only=True)
        logger.info(f"Initialized KServe reranker client: {self.endpoint}")
        print(f" ************************** Reranker: {self.endpoint} ")
    
    
    def _tokenize_pairs(self, pairs: List[List[str]], max_length: int = 512):
        """Tokenize query-document pairs for the reranker"""
        # Prepare batch arrays
        input_ids_batch = []
        attention_mask_batch = []
        
        for pair in pairs:
            # BGE reranker expects query and document as separate inputs to tokenizer
            # The tokenizer handles the special token separation internally
            query, document = pair[0], pair[1]
            
            encoded = self.tokenizer(
                query,
                document,
                padding='max_length',
                truncation=True,
                max_length=max_length,
                return_tensors="np"  # Return numpy arrays for easier batch processing
            )
            
            input_ids_batch.append(encoded["input_ids"][0])  # Remove batch dimension
            attention_mask_batch.append(encoded["attention_mask"][0])
        
        # Convert to numpy arrays with shape [batch_size, seq_length]
        input_ids_np = np.array(input_ids_batch, dtype=np.int64)
        attention_mask_np = np.array(attention_mask_batch, dtype=np.int64)
        
        # Prepare the input data for KServe
        input_ids = {
            "name": "input_ids",
            "shape": list(input_ids_np.shape),  # e.g., [batch_size, seq_length]
            "datatype": "INT64",
            "data": input_ids_np.flatten().tolist()  # Flatten to 1D list
        }
        
        attention_mask = {
            "name": "attention_mask",
            "shape": list(attention_mask_np.shape),  # e.g., [batch_size, seq_length]
            "datatype": "INT64", 
            "data": attention_mask_np.flatten().tolist()  # Flatten to 1D list
        }
        
        # Create the final data structure for KServe
        tokenized_pairs = {"inputs": [input_ids, attention_mask]}
        return tokenized_pairs
    
    
    def compute_score(self, pairs: List[List[str]], normalize: bool = True, max_length=512) -> List[float]:
        """Compute similarity scores for query-document pairs"""
        if not pairs:
            return []
        
        # Tokenize query-document pairs
        data = self._tokenize_pairs(pairs, max_length)
        
        response = requests.post(self.endpoint, json=data, verify=False)
        response.raise_for_status()
        response_json = response.json()
        
        # Process the reranker output
        if "outputs" in response_json:
            logits_output = next(out for out in response_json["outputs"] if out["name"] == "logits")
            logits_data = logits_output["data"]
            logits_shape = logits_output["shape"]
            
            # Reshape logits back to original shape [batch_size, 1]
            raw_logits = np.array(logits_data).reshape(logits_shape)
            # print(f"Raw logits shape: {raw_logits.shape}")  # [1, 1]
            
            if normalize:
                # Option 1: Sigmoid normalization (0-1 range) - Most common for rerankers
                similarity_scores = torch.sigmoid(torch.tensor(raw_logits)).numpy()
            else:
                # Return raw logits without normalization
                similarity_scores = raw_logits
            # Convert logits to similarity scores using sigmoid. # Higher scores indicate more relevance
            # similarity_scores = torch.sigmoid(torch.tensor(raw_logits)).numpy()
            scores = similarity_scores.flatten()  # Convert to 1D array
            return scores
        
        return []


class SentenceTransformerKServeAdapter:
    """Adapter that mimics SentenceTransformer interface using KServe"""
    
    def __init__(self, retriever_config, model_name: str = None, device: str = None, normalize_embeddings: bool = True):
        # Get endpoint from config with fallbacks
        kserve_endpoint = retriever_config.get("kserve_endpoint")
        kserve_path = retriever_config.get("path")
        
        self.client = KServeEmbeddingClient(kserve_endpoint, kserve_path, model_name)
        self.normalize_embeddings = normalize_embeddings
    
    def encode(self, sentences: Union[str, List[str]], text_type: str = "query", **kwargs):
        """Encode sentences to embeddings"""
        return self.client.embed_query(sentences, text_type, self.normalize_embeddings)
    
    def embed_query(self, query: Union[str, List[str]]):
        """Generate query embeddings"""
        return self.client.embed_query(query, "query", self.normalize_embeddings)

    def embed_documents(self, documents: Union[str, List[str]]):
        """Generate document embeddings"""
        return self.client.embed_query(documents, "passage", self.normalize_embeddings)


class RerankerKServeAdapter:
    """Adapter that provides FlagReranker-like interface using KServe"""
    
    def __init__(self, reranker_config, model_name: str = None, device: str = None, normalize_embeddings: bool = True):
        # Get endpoint from config with fallbacks
        kserve_endpoint = reranker_config.get("kserve_endpoint")
        kserve_path = reranker_config.get("path")
        
        self.client = KServeRerankerClient(kserve_endpoint, kserve_path)
    
    def compute_score(self, pairs: List[List[str]], normalize: bool = True) -> List[float]:
        """Compute similarity scores for query-document pairs"""
        return self.client.compute_score(pairs, normalize)


