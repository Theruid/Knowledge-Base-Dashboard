"""
Simple API Client for Dashboard Retrieve Service
"""
import requests
import logging

logger = logging.getLogger(__name__)

def information_retrieve(text_request: str):
    """
    Send request to dashboard API and return result
    
    Args:
        text_request: The query text
        
    Returns:
        Dictionary with context, top_10_context, domain, query_is_abstract, obvious_answer
    """
    url = "https://sg-nlp-dev.ml.abramad.com/chatbot-dashboard/dashboard_retrieve"
    
    headers = {
        'accept': 'application/json',
        'X-Customer-ID': 'sepidar_test',
        'X-API-Key': 'dev_api_key',
        'Content-Type': 'application/json'
    }
    
    payload = {"query": text_request}
    
    # Default values in case of API failure or null responses
    default_response = {
        'context': 'No context available',  # or '' if you prefer empty string
        'top_10_context': [],
        'domain': "-1",
        'query_is_abstract': True,
        'obvious_answer': 'No answer available',  # or '----'
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            # Use .get() with fallback to default values to handle None/null
            return {
                'context': data.get('context_preview') or default_response['context'],
                'top_10_context': data.get('top_contexts') or default_response['top_10_context'],
                'domain': (data.get('domains', ["-1"])[0] if data.get('domains') else default_response['domain']),
                'query_is_abstract': data.get('query_is_abstract', default_response['query_is_abstract']),
                'obvious_answer': data.get('obvious_answer') or default_response['obvious_answer'],
            }
        else:
            logger.error(f"API request failed: {response.status_code}")
            return default_response
            
    except Exception as e:
        logger.error(f"Error in information_retrieve: {str(e)}")
        return default_response