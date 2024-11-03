import spacy
from spacy.training.example import Example
import json
import os
import random

# Define the folder where your training data files are stored
TRAINING_DATA_FOLDER = r"D:\degreeFileConversion\file-conversion\backend-flask\training\training_data"

def load_training_data():
    training_data = []
    for filename in os.listdir(TRAINING_DATA_FOLDER):
        if filename.endswith(".json"):
            file_path = os.path.join(TRAINING_DATA_FOLDER, filename)
            with open(file_path, "r") as f:
                try:
                    # Load data and skip if the file is empty
                    data = json.load(f)
                    if not data:  # Skip if the JSON file is empty
                        print(f"Skipping empty file: {filename}")
                        continue
                    for entry in data:
                        training_data.append((entry["text"], {"entities": entry["entities"]}))
                except json.JSONDecodeError:
                    print(f"Error loading {filename}: Invalid JSON format. Skipping this file.")
    return training_data

def train_ner_model():
    # Initialize a blank English model
    nlp = spacy.blank("en")
    ner = nlp.add_pipe("ner")

    # Add labels based on the fields in your data
    ner.add_label("UNIT_PRICE")
    # Commented out these labels because they correspond to empty files
    # ner.add_label("DESCRIPTION")
    # ner.add_label("PO")

    # Load and combine all training data from files
    TRAIN_DATA = load_training_data()

    # Convert to spaCy's Example format
    examples = []
    for text, annotations in TRAIN_DATA:
        doc = nlp.make_doc(text)
        example = Example.from_dict(doc, annotations)
        examples.append(example)

    # Training the model
    optimizer = nlp.begin_training()
    for i in range(30):  # Increase iterations as needed for accuracy
        random.shuffle(examples)
        losses = {}
        for example in examples:
            nlp.update([example], drop=0.5, losses=losses)
        print(f"Losses at iteration {i}: {losses}")

    # Save the model
    output_dir = "training/output"
    os.makedirs(output_dir, exist_ok=True)
    nlp.to_disk(output_dir)
    print(f"Model trained and saved to '{output_dir}'")

if __name__ == "__main__":
    train_ner_model()
