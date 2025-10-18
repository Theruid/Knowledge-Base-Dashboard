import sqlite3
import os
import zipfile
import datetime
import chromadb
import shutil
from langchain_text_splitters                 import RecursiveCharacterTextSplitter
from langchain_huggingface                    import HuggingFaceEmbeddings
from langchain_chroma                         import Chroma
from langchain.schema.document                import Document

# Disable PostHog analytics to prevent connection errors
os.environ["ANONYMIZED_TELEMETRY"] = "False"
chromadb.Settings.anonymized_telemetry = False
# import torch

# # Set CUDA device to GPU 1
# torch.cuda.set_device(1)

def initiate_vector_database():
    # Load embedding model
    try:
        # Explicitly use GPU 0
        print("Attempting to use GPU 0 for embeddings")
        embedding_model = HuggingFaceEmbeddings(
            model_name='/app/saved_models/information_retrieval/25540', 
            model_kwargs={"device": 'cuda:0'},
            encode_kwargs={"normalize_embeddings": True}  # Set for cosine similarity
        )
        print("Successfully using GPU 0 for embeddings")
    except RuntimeError as e:
        # Fall back to CPU if GPU is not available
        print(f"GPU error: {e}\nFalling back to CPU")
        embedding_model = HuggingFaceEmbeddings(
            model_name='/app/saved_models/information_retrieval/25540', 
            model_kwargs={"device": 'cpu'},
            encode_kwargs={"normalize_embeddings": True}  # Set for cosine similarity
        )


    # collection_path = '/home/user01/support_chatbot_workspace/chatbot-deployment-masoud/chatbot-deployment-sepidar/rag_api/VectorDB'
    collection_path = '/app/VectorDB'
    db_file_path = "knsystem.db" # SQLite database file
    
    # Connect to SQLite database
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    
    # Query the Knowledges table
    cursor.execute("SELECT problem, detailed_solution, domain, knowledge_number FROM Knowledges")
    rows = cursor.fetchall()
    
    # Create documents from database records
    documents = []
    for row in rows:
        problem, detailed_solution, domain, knowledge_number = row
        # Create a document with problem as page content and other fields as metadata
        doc = Document(
            page_content=problem if problem else "",
            metadata={
                "detailed_solution": detailed_solution if detailed_solution else "",
                "domain": domain if domain else "",
                "knowledge_number": knowledge_number if knowledge_number else ""
            }
        )
        documents.append(doc)
    
    # Close the database connection
    conn.close()
    
    print(f"Loaded {len(documents)} documents from database")
    if documents:
        print("Sample document:", documents[0])
    
    
    # print(f'Creating a vector DB in {collection_path} ...')
    # document_loader = DirectoryLoader(path=config["database"]['documents_addr'], glob="**/*.txt", loader_cls=TextLoader)
    # documents = document_loader.load()
    # print(documents[0])
    
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=3500,
                                                   chunk_overlap=0)
    chunks = text_splitter.split_documents(documents)
    print(f'Generated {len(chunks)} chunks from {len(documents)} documents')

    vdb = Chroma(persist_directory=collection_path, embedding_function=embedding_model)

    # Delete the vector database client first to release any file locks
    del vdb
    
    # Remove the entire VectorDB directory for a clean start
    print(f'Removing existing VectorDB directory at {collection_path}')
    try:
        if os.path.exists(collection_path):
            shutil.rmtree(collection_path)
            print(f'Successfully removed VectorDB directory')
        os.makedirs(collection_path, exist_ok=True)
        print(f'Created fresh VectorDB directory')
    except Exception as e:
        print(f'Error while removing/recreating VectorDB directory: {e}')
    
    # Reinitialize the vector database
    vdb = Chroma(persist_directory=collection_path, embedding_function=embedding_model)

    # Maximum batch size (reduced to stay within ChromaDB limits)
    max_batch_size = 5000
    # Split chunks into smaller batches and add them to the vector DB
    for i in range(0, len(chunks), max_batch_size):
        document = chunks[i:i + max_batch_size]
        vdb.add_documents(document)
        print(f'Added batch {i // max_batch_size + 1} ({len(document)} documents)')
        
    
    print(f'{len(chunks)} documents have been added to the vector DB')
    
    # Create a backup zip of the vector database
    create_backup_zip(collection_path)

def create_backup_zip(source_dir):
    """Create a versioned backup zip of the vector database"""
    # Make sure source directory exists
    if not os.path.exists(source_dir):
        print(f"Error: Vector database directory not found at {source_dir}")
        return
    
    # Create destination directory inside the vector DB directory
    # This ensures it's saved in the correct mapped volume
    dest_dir = os.path.join(source_dir, "Zips")
    print(f"Using backup directory: {dest_dir}")
    
    # Try to create the directory, handle any errors
    try:
        if not os.path.exists(dest_dir):
            os.makedirs(dest_dir)
        print(f"Directory exists or was created: {dest_dir}")
    except Exception as e:
        print(f"Warning: Could not create directory {dest_dir}: {e}")
        # Fall back to using the source directory
        dest_dir = source_dir
        print(f"Using fallback directory: {dest_dir}")
    
    # Generate timestamp for the zip file name
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = os.path.join(dest_dir, f"vector_db_backup_{timestamp}.zip")
    
    print(f"Creating backup of vector database to {zip_filename}...")
    
    # Create a zip file of the vector database
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Skip the Zips directory itself to avoid recursion
            if "Zips" in root:
                continue
                
            for file in files:
                file_path = os.path.join(root, file)
                # Calculate path inside zip file
                arcname = os.path.relpath(file_path, os.path.dirname(source_dir))
                zipf.write(file_path, arcname)
    
    print(f"Backup created successfully at {zip_filename}")
    
def main():
    initiate_vector_database()
    
if __name__ == "__main__":
    main()