from fastapi                                  import HTTPException
import requests
import json
def information_retrieve(text):
    """
    Send a retrieval request to the RAG IR-RR service.
    Args:
        text (str): The query text to retrieve documents for
    Returns:
        dict: JSON response from the API
    """
    history=None,
    customer_id="RAG-20250728-B255AB22"
    api_key="dev_api_key" 
    base_url="http://rag-ir-rr.cs-sg-nlp.svc.cluster.local"
                    
    if history is None:
        history = []
    
    url = f"{base_url}/retrieve"
    
    headers = {
        'accept': 'application/json',
        'X-Customer-ID': customer_id,
        'X-API-Key': api_key,
        'Content-Type': 'application/json'
    }
    
    payload = {
        "text": text,
        "history": history
    }
    
    response = requests.post(url, headers=headers, json=payload, verify=False)
    response.raise_for_status()  # Raise exception for bad status codes
    
    return response.json()
