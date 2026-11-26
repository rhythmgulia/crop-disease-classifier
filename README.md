# 🌱 Crop Disease Classifier

An AI-powered crop disease detection platform that leverages Deep Learning and Computer Vision to identify plant diseases from leaf and fruit images. Built using transfer learning with EfficientNet-B0, the platform aims to make crop disease identification more accessible through an intuitive web application and multilingual AI-powered assistance.

## ✨ Overview

Crop diseases can significantly impact agricultural productivity, especially when identification and intervention are delayed.

This project uses a deep learning-based image classification model to identify crop diseases from uploaded images. It combines computer vision with a full-stack web application to provide an accessible interface for disease detection and agricultural assistance.

The classification model is fine-tuned using the PlantVillage dataset and uses EfficientNet-B0 as its backbone.

## 🚀 Key Features

- **AI-Powered Disease Detection:** Identify plant and fruit diseases using deep learning and image classification.
- **Transfer Learning:** Fine-tuned EfficientNet-B0 architecture with ImageNet-pretrained weights.
- **Multilingual AI Assistance:** Integration with Sarvam AI for speech recognition, text-to-speech, and translation.
- **Voice Interaction:** Enables users to interact with the application through voice-based functionality.
- **User-Friendly Interface:** Web-based interface for interacting with the disease classification system.
- **Persistent Data Storage:** Database integration for application data and user-related functionality.
- **Authentication:** Secure authentication and protected application functionality.

## 🧠 Machine Learning Approach

### Model Architecture

The project uses **EfficientNet-B0**, a convolutional neural network architecture that balances computational efficiency and classification performance.

Instead of training an entire network from scratch, transfer learning is used to leverage features learned from ImageNet.

The original classification head is replaced with a custom classification head:

- Dropout (0.2)
- Fully Connected Layer (1280 → Number of Classes)

### Training Strategy

The model is trained using a two-phase approach:

**Phase 1 – Classifier Warm-up**
- Freeze the pretrained backbone.
- Train only the custom classification head.
- Optimizer: AdamW.
- Learning rate: 0.001.

**Phase 2 – Fine-tuning**
- Unfreeze selected backbone layers.
- Fine-tune the network on the crop disease dataset.
- Optimize the model for the target classification task.

### Data Preprocessing and Augmentation

Images are resized to 224 × 224 pixels and normalized using ImageNet mean and standard deviation.

Training augmentations include:
- Random horizontal flipping.
- Random vertical flipping.
- Random rotation (±15°).
- Color jittering (brightness, contrast, saturation, and hue).

### Dataset

The model is trained on the **PlantVillage Color Dataset**.

| Dataset attribute | Details |
|---|---|
| Total images | 54,305 |
| Number of classes | 38 |
| Training split | 70% |
| Validation split | 15% |
| Testing split | 15% |
| Input resolution | 224 × 224 |
| Image format | RGB |

The dataset contains images representing healthy and diseased plants across multiple crop varieties.

### Model Performance

The model achieved the following results on the held-out test dataset:

| Metric | Result |
|---|---:|
| Test Accuracy | 93.15% |
| Macro F1-Score | 91.49% |

The evaluation uses accuracy and macro F1-score to assess overall classification performance, including performance across individual disease classes.

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js, Vite |
| Backend | Python, FastAPI |
| Machine Learning | PyTorch, Torchvision |
| Model Architecture | EfficientNet-B0 |
| Database | SQLite / SQLAlchemy |
| AI Voice Services | Sarvam AI |
| Speech Recognition | Saaras v4 |
| Text-to-Speech | Bulbul v4-flash |
| Translation | Mayura v1 |
| Version Control | Git, GitHub |

## 🏗️ Project Structure

```text
crop-disease-classifier/
│
├── backend/
│   └── Backend application and API
│
├── frontend/
│   └── React + Vite application
│
├── data/
│   └── Dataset and related resources
│
├── .env.example
├── .gitignore
└── README.md
```

## ⚙️ Getting Started

### Prerequisites

Make sure you have the following installed:

- Python 3.10+
- Node.js 18+
- npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/rhythmgulia/crop-disease-classifier.git

cd crop-disease-classifier
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create and activate a virtual environment:

```bash
python -m venv venv
```

Activate it:

**macOS / Linux**
```bash
source venv/bin/activate
```

**Windows**
```bash
venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Configure the environment variables using the root `.env.example` file.

Start the backend using your FastAPI application entry point:

```bash
uvicorn <module>:app --reload
```

Replace `<module>` with the actual Python module containing your FastAPI application.

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at the local URL displayed by Vite.

## 🔐 Environment Variables

Create a `.env` file using the provided `.env.example` template.

| Variable | Description |
|---|---|
| `SARVAM_API_KEY` | API key for Sarvam AI services |
| `DATABASE_URL` | Database connection URL |
| `AUTH_SECRET` | Secret used for authentication |
| `AGRONOMIST_INVITE_CODE` | Private invitation code for agronomist access |
| `VITE_API_URL` | Backend API URL for the frontend |

Example:

```env
SARVAM_API_KEY=your_sarvam_api_key
DATABASE_URL=sqlite:///./cropdisease.db
AUTH_SECRET=your_secure_random_secret
AGRONOMIST_INVITE_CODE=your_private_invite_code
VITE_API_URL=
```

**Important:** Never expose private API keys or authentication secrets in frontend code or commit your `.env` file to GitHub.

## 📊 Model Evaluation

The model is evaluated using:

- **Accuracy:** Measures the proportion of correctly classified images.
- **Precision:** Measures how many positive predictions are correct.
- **Recall:** Measures how many actual positive instances are identified.
- **Macro F1-Score:** Evaluates classification performance across all classes equally.
- **Confusion Matrix:** Helps analyze misclassifications between disease categories.

## ⚠️ Limitations

The PlantVillage dataset primarily contains images captured under controlled conditions with relatively clean backgrounds and good lighting.

Consequently, real-world images with complex backgrounds, varying lighting conditions, overlapping leaves, or multiple diseases may affect prediction reliability.

Further improvements can include incorporating more diverse real-world datasets such as PlantDoc and PlantWild.

**Note:** Model predictions should be treated as decision-support information rather than a substitute for professional agricultural diagnosis.

## 🔮 Future Improvements

- Expand training data using real-world crop disease datasets.
- Improve robustness against complex backgrounds and lighting conditions.
- Integrate weather-based disease risk assessment.
- Enhance multilingual agricultural assistance.
- Improve model explainability using Grad-CAM.
- Optimize inference speed and deployment scalability.
- Expand the range of supported crops and disease categories.

## 👨‍💻 Author

**Rhythm Gulia**

B.Tech – Computer Science and Engineering (AI & ML)

- GitHub: [@rhythmgulia](https://github.com/rhythmgulia)

---

⭐ If you find this project interesting, consider giving the repository a star!

