import os
from typing import List
import numpy as np
import pandas as pd
from PIL import Image
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.preprocessing.image import load_img
from tensorflow.keras.preprocessing.image import img_to_array
from models.skin_tone.skin_tone_knn import identify_skin_tone
# import cv2 # No longer needed here if only used for face detection
from flask import Flask, request
from flask_restful import Api, Resource, reqparse, abort
# from flask_cors import CORS # CORS no longer needed with Vite proxy
# import werkzeug
from models.recommender.rec import recs_essentials, makeup_recommendation
import base64
import re # Import regex module
from io import BytesIO
from PIL import Image # Keep PIL for the SkinMetrics endpoint
import numpy as np # Keep numpy for ML models

app = Flask(__name__)
# CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}) # CORS no longer needed with Vite proxy
api = Api(app)

# --- Face Detection Constants Removed ---


class_names1 = ['Dry_skin', 'Normal_skin', 'Oil_skin']
class_names2 = ['Low', 'Moderate', 'Severe']
skin_tone_dataset = 'models/skin_tone/skin_tone_dataset.csv'


def get_model():
    global model1, model2
    # Construct paths relative to this script's location
    script_dir = os.path.dirname(__file__)
    model1_path = os.path.join(script_dir, 'models', 'skin_model')
    model2_path = os.path.join(script_dir, 'models', 'acne_model')

    print(f"Attempting to load model1 from: {model1_path}")
    model1 = load_model(model1_path)
    print('Model 1 loaded')

    print(f"Attempting to load model2 from: {model2_path}")
    model2 = load_model(model2_path)
    print("Model 2 loaded!")


def load_image(img_path):
    img = image.load_img(img_path, target_size=(224, 224))
    # (height, width, channels)
    img_tensor = image.img_to_array(img)
    # (1, height, width, channels), add a dimension because the model expects this shape: (batch_size, height, width, channels)
    img_tensor = np.expand_dims(img_tensor, axis=0)
    # imshow expects values in the range [0, 1]
    img_tensor /= 255.
    return img_tensor


def prediction_skin(img_path):
    new_image = load_image(img_path)
    pred1 = model1.predict(new_image)
    # print(pred1)
    if len(pred1[0]) > 1:
        pred_class1 = class_names1[tf.argmax(pred1[0])]
    else:
        pred_class1 = class_names1[int(tf.round(pred1[0]))]
    return pred_class1


def prediction_acne(img_path):
    new_image = load_image(img_path)
    pred2 = model2.predict(new_image)
    # print(pred2)
    if len(pred2[0]) > 1:
        pred_class2 = class_names2[tf.argmax(pred2[0])]
    else:
        pred_class2 = class_names2[int(tf.round(pred2[0]))]
    return pred_class2


get_model()


img_put_args = reqparse.RequestParser()
img_put_args.add_argument(
    "file", type=str, help="Please provide a valid base64 image string", required=True) # Keep type as str for base64

# --- Face Detection Request Parser Removed ---


rec_args = reqparse.RequestParser()

rec_args.add_argument(
    "tone", type=int, help="Argument required", required=True)
rec_args.add_argument(
    "type", type=str, help="Argument required", required=True)
rec_args.add_argument("features", type=dict,
                      help="Argument required", required=True)


class Recommendation(Resource):
    def put(self):
        args = rec_args.parse_args()
        print(args)
        features = args['features']
        tone = args['tone']
        skin_type = args['type'].lower()
        skin_tone = 'light to medium'
        if tone <= 2:
            skin_tone = 'fair to light'
        elif tone >= 4:
            skin_tone = 'medium to dark'
        print(f"{skin_tone}, {skin_type}")
        fv = []
        for key, value in features.items():
            # if key == 'skin type':
            #     skin_type = key
            # elif key == 'skin tone':
            #     skin_tone = key
            #     continue
            fv.append(int(value))

        general = recs_essentials(fv, None)

        makeup = makeup_recommendation(skin_tone, skin_type)
        return {'general': general, 'makeup': makeup}


class SkinMetrics(Resource):
    def put(self):
        args = img_put_args.parse_args()
        print(args)
        file = args['file']
        # Decode base64 image - handle optional prefix using regex and fix padding
        try:
            # Use regex to find the base64 data part after "base64,"
            match = re.search(r'base64,(.*)', file)
            if match:
                image_data_base64 = match.group(1)
            else:
                # Assume the entire string is base64 if no prefix found
                image_data_base64 = file

            # Ensure correct padding
            missing_padding = len(image_data_base64) % 4
            if missing_padding:
                image_data_base64 += '=' * (4 - missing_padding)

            # Log the string before attempting decode
            print(f"Attempting to decode base64 string (len={len(image_data_base64)}): {image_data_base64[:80]}...") # Log start of string

            # Decode the base64 string
            image_data_bytes = base64.b64decode(image_data_base64)
            print("Base64 decoding successful.") # Log success
            # Convert to PIL Image
            pil_im = Image.open(BytesIO(image_data_bytes))
            print("PIL Image loaded successfully.") # Log success

            # --- Save image with robust path ---
            filename = 'image.png'
            # Get directory where app.py is located
            script_dir = os.path.dirname(os.path.abspath(__file__))
            # Define static directory relative to script directory
            static_dir = os.path.join(script_dir, 'static')
            # Ensure the static directory exists
            os.makedirs(static_dir, exist_ok=True)
            # Create the full path for the image file
            file_path = os.path.join(static_dir, filename)
            print(f"Saving temporary image to: {file_path}") # Log the save path
            pil_im.save(file_path)
            print("Temporary image saved successfully.") # Log success
            # --- End save image ---

        except (base64.binascii.Error, ValueError) as e: # Catch specific base64/value errors
             print(f"Base64 Decoding Error: {e}")
             # Provide a more specific error message for bad requests
             abort(400, message=f"Invalid base64 image data provided. Detail: {e}")
        except Exception as e: # Catch other potential errors (PIL, file I/O, etc.)
             print(f"Error processing image after decoding: {e}")
             # Use 500 for internal server errors during processing
             abort(500, message=f"Error processing image after decoding. Detail: {e}")

        # --- Perform Predictions (Existing Logic) ---
        try:
            print(f"Starting predictions for image: {file_path}")
            skin_type = prediction_skin(file_path).split('_')[0]
            print(f"Skin type prediction done: {skin_type}")
            acne_type = prediction_acne(file_path)
            print(f"Acne prediction done: {acne_type}")

            # Construct absolute path for the dataset relative to this script (app.py)
            script_dir = os.path.dirname(os.path.abspath(__file__))
            dataset_path = os.path.join(script_dir, skin_tone_dataset) # skin_tone_dataset is 'models/skin_tone/skin_tone_dataset.csv'
            print(f"Using dataset path for skin tone: {dataset_path}")

            tone = identify_skin_tone(file_path, dataset=dataset_path) # Pass absolute path
            print(f"Skin tone identification done: {tone}")
            print(f"Final Results - Skin Type: {skin_type}, Acne: {acne_type}, Tone: {tone}")
        except Exception as e:
            # Log the specific error during prediction
            print(f"!!! Error during ML prediction for {file_path}: {e}")
            abort(500, message="Error processing image features")

        return {'type': skin_type, 'tone': str(tone), 'acne': acne_type}, 200


# --- FaceDetection Resource Removed ---


api.add_resource(SkinMetrics, "/api/upload") # Added /api prefix
api.add_resource(Recommendation, "/api/recommend") # Added /api prefix
# api.add_resource(FaceDetection, "/api/detect-face") # Route registration removed


# --- Commented out old routes ---
# @app.route("/", methods=['GET', 'POST'])
# def home():
#     return render_template('home.html')

# @app.route("/predict", methods = ['GET','POST'])
# def predict():
#     if request.method == 'POST':
#         file = request.files['file']
#         filename = file.filename
#         file_path = os.path.join('./static',filename)                       
#         file.save(file_path)
#         skin_type = prediction_skin(file_path)
#         acne_type = prediction_acne(file_path)
#         print(skin_type)
#         print(acne_type)
#         return skin_type, acne_type

# --- Main execution block ---
if __name__ == "__main__":
    app.run(debug=True)
