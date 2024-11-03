import spacy

def test_model(text):
    print("Testing model with test: ", text)
    try:
        # Load the trained model
        nlp = spacy.load("training/output")
        print("Model loaded successfully.")  # Debugging line

        # Process the input text
        doc = nlp(text)

        # Extract and print recognized phone numbers
        for ent in doc.ents:
            if ent.label_ == "PHONE":
                print(f"Recognized phone number: {ent.text}")
    except Exception as e:
        print(f"An error occurred: {e}")  # Catch and display any errors


if __name__ == "__main__":
    # Test sentences
    test_sentences = [
        "Please call us at 604-3719033 for more information.",
        "Contact our office at +604-2345678.",
        "You can reach us at 04-4528765.",
        "Our alternate number is 604-3457552.",
        "This is a random sentence without a phone number."
    ]

    # Test the model on each sentence
    for sentence in test_sentences:
        print(f"\nTesting sentence: {sentence}")
        test_model(sentence)

    
