# Skincare Analysis and Recommendation System

## Description

Web application designed to analyze user-uploaded images to determine skin metrics and provide personalized skincare and makeup product recommendations. It leverages machine learning models to predict skin type, acne severity, and identify skin tone.

## Features

- **Skin Type Prediction:** Classifies skin as Dry, Normal, or Oily using a Keras model.
- **Acne Severity Prediction:** Determines acne severity as Low, Moderate, or Severe using a Keras model.
- **Skin Tone Identification:** Identifies skin tone using OpenCV for skin segmentation and a K-Nearest Neighbors (KNN) classifier trained on color values.
- **Product Recommendations:**
  - **General Skincare:** Recommends essential products (cleanser, moisturizer, etc.) based on predicted skin type, tone, and user-selected concerns using cosine similarity.
  - **Makeup:** Recommends foundation, concealer, and primer based on identified skin tone and predicted skin type.
- **Web Interface:** A React-based frontend allows users to upload images and view their analysis results and recommendations.

## Technology Stack

### Backend (Python)

- **Core Framework & API:**
  - Flask==2.0.2
  - Flask-RESTful==0.3.9
- **Machine Learning & Data:**
  - tensorflow==2.13.0
  - tensorflow-intel==2.13.0 (Specific build for Intel optimization)
  - keras==2.13.1
  - scikit-learn==1.3.2 (Used for KNN, Cosine Similarity)
  - numpy==1.26.4
  - pandas==2.0.3
- **Image Processing:**
  - Pillow==10.1.0 (PIL fork)
  - opencv-python==4.8.1.78
- **Utilities:**
  - requests==2.31.0 (Used in `tests.py`)
  - matplotlib==3.7.4 (Used in `skin_detection.py`, potentially for debugging/visualization)
  - _Note: `requirements.txt` lists direct dependencies. `pip` handles transitive dependencies._

### Frontend (JavaScript/React)

- **Core Framework & UI:**
  - react@^19.1.0
  - react-dom@^19.1.0
  - @mui/material@^7.0.1 (Material UI component library)
  - @emotion/react@^11.14.0 (Required by MUI)
  - @emotion/styled@^11.14.0 (Required by MUI)
- **Routing:**
  - react-router-dom@^7.5.0
- **API Communication:**
  - axios@^1.8.4
- **Camera & Vision:**
  - react-webcam@^7.2.0
  - @mediapipe/tasks-vision@^0.10.22-rc.20250304 (Likely for potential future client-side face detection/analysis)
- **Build Tool & Development:**
  - vite@^6.2.5 (Build tool and dev server)
  - @vitejs/plugin-react@^4.3.4 (Vite plugin for React)
  - _Note: Versions listed are from `package.json`. `npm install` or `yarn install` manages exact versions and dependencies._

### ML Models

- Saved Keras models (`.pb` format) for skin type and acne severity.
- Dataset (`backend/models/skin_tone/skin_tone_dataset.csv`) and KNN logic for skin tone.
- Product datasets (`backend/models/recommender/*.csv`) for recommendation engine.

## Project Structure

```
Skin Analysis/
├── .gitignore
├── .prettierrc
├── requirements.txt       # Python backend dependencies
├── README.md              # This file
├── backend/               # Flask API and ML models
│   ├── app.py             # Main Flask application
│   ├── tests.py           # API test script (basic)
│   ├── models/            # ML models and related data/scripts
│   │   ├── acne_model/    # Keras model for acne severity
│   │   ├── recommender/   # Recommendation engine logic and data
│   │   ├── skin_model/    # Keras model for skin type
│   │   └── skin_tone/     # Skin tone detection logic and data
│   ├── static/            # Static files served by Flask (e.g., uploaded images)
│   └── templates/         # HTML templates (if any were used directly by Flask)
├── frontend/              # React frontend application
│   ├── public/            # Static assets for frontend
│   ├── src/               # React source code
│   ├── index.html         # Entry point for Vite
│   ├── package.json       # Node.js dependencies and scripts
│   └── vite.config.js     # Vite configuration (includes proxy to backend)
├── images/                # Project-related images (e.g., diagrams, examples)
├── ML/                    # Original ML model training notebooks and data (not directly used by the running app)
└── static/                # Potentially duplicate or old static files (review needed)
```

## Setup and Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/sanukjoseph/Skin-Analysis.git
    ```

    - Navigate to the project directory:
      ```bash
      cd Skin-Analysis
      ```
    - If you are using GitHub Desktop, you can clone the repository directly from the app.

2.  **Backend Setup:**

    - **Create and activate a virtual environment (recommended):**
      ```bash
      python -m venv venv
      # Windows
      .\venv\Scripts\activate
      # macOS/Linux
      source venv/bin/activate
      ```
    - **Install Python dependencies:**
      ```bash
      pip install -r requirements.txt
      ```

3.  **Frontend Setup:**
    - **Navigate to the frontend directory:**
      ```bash
      cd frontend
      ```
    - **Install Node.js dependencies:**
      ```bash
      npm install
      ```
    - **Return to the root directory:**
      ```bash
      cd ..
      ```

## Running the Application

1.  **Start the Backend Server:**

    - Make sure you are in the root directory (`Skin Analysis`) and your virtual environment is activated.
    - Run the Flask app:
      ```bash
      python backend/app.py
      ```
    - The backend API will be running on `http://127.0.0.1:5000/`.

2.  **Start the Frontend Development Server:**
    - Open a **new terminal**.
    - Navigate to the frontend directory:
      ```bash
      cd frontend
      ```
    - Run the Vite development server:
      ```bash
      npm run dev
      ```
    - The frontend will be accessible at `http://localhost:5173/` (or another port if 5173 is busy). API requests from the frontend are automatically proxied to the backend running on port 5000 (configured in `vite.config.js`).

## API Endpoints

- **`PUT /api/upload`**
  - **Request Body:** JSON object with a single key `file` containing the base64 encoded image string.
    ```json
    {
      "file": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE..."
    }
    ```
  - **Response:** JSON object with predicted skin metrics.
    ```json
    {
      "type": "Oily",
      "tone": "3", // Skin tone category (1-6)
      "acne": "Moderate"
    }
    ```
- **`PUT /api/recommend`**
  - **Request Body:** JSON object with skin tone, type, and user concerns.
    ```json
    {
      "tone": 3,
      "type": "oily",
      "features": {
        "normal": 0,
        "dry": 0,
        "oily": 1,
        "combination": 0,
        "acne": 1,
        "sensitive": 0,
        "fine lines": 0,
        "wrinkles": 0,
        "redness": 1,
        "dull": 0,
        "pore": 1,
        "pigmentation": 0,
        "blackheads": 1,
        "whiteheads": 0,
        "blemishes": 1,
        "dark circles": 0,
        "eye bags": 0,
        "dark spots": 0
      }
    }
    ```
  - **Response:** JSON object containing lists of recommended general skincare and makeup products.
    ```json
    {
      "general": {
        "cleanser": [ { "brand": "...", "name": "...", ... } ],
        "moisturizer": [ { "brand": "...", "name": "...", ... } ],
        // ... other categories
      },
      "makeup": [
        { "brand": "...", "name": "Foundation XYZ", ... },
        { "brand": "...", "name": "Concealer ABC", ... }
        // ... other makeup items
      ]
    }
    ```

## ML Models Details

- The Keras models for skin type and acne are located in `backend/models/skin_model/` and `backend/models/acne_model/` respectively.
- The skin tone detection uses OpenCV functions and a KNN model trained on data likely derived from `backend/models/skin_tone/skin_tone_dataset.csv`. The core logic is in `skin_detection.py` and `skin_tone_knn.py`.
- The recommendation engine uses cosine similarity on product features derived from CSV files in `backend/models/recommender/`.
