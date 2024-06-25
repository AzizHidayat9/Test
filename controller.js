const tf = require('@tensorflow/tfjs-node');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const db = require('./firebase');

const modelURL = 'https://storage.googleapis.com/mlgc-submission-aziz/Model%20proyek%20CC%20ML/model.json';
let model;

// Load TensorFlow model
tf.loadGraphModel(modelURL).then(loadedModel => {
    model = loadedModel;
    console.log("Model loaded successfully");
}).catch(err => {
    console.error("Failed to load model", err);
});

// Function to predict cancer
const predictCancer = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'fail',
                message: 'Terjadi kesalahan dalam melakukan prediksi: file gambar tidak ditemukan'
            });
        }

        const imageBuffer = req.file.buffer;
        const imageTensor = tf.node.decodeImage(imageBuffer);
        const resizedImageTensor = tf.image.resizeBilinear(imageTensor, [224, 224]);
        const expandedImageTensor = resizedImageTensor.expandDims(0);

        const prediction = model.predict(expandedImageTensor);
        const predictionResult = prediction.dataSync();

        const result = predictionResult[0] > 0.5 ? "Cancer" : "Non-Cancer";

        const predictionData = {
            id: uuidv4(),
            result: result,
            suggestion: result === "Cancer" ? 'Segera periksa ke dokter!' : 'Anda sehat!',
            createdAt: moment().toISOString()
        };

        // Save prediction to Firestore
        await db.collection('predictions').doc(predictionData.id).set(predictionData);

        return res.status(200).json({
            status: 'success',
            message: 'Model predicted successfully',
            data: predictionData
        });
    } catch (error) {
        console.error("Prediction error", error);
        return res.status(400).json({
            status: 'fail',
            message: 'Terjadi kesalahan dalam melakukan prediksi'
        });
    }
};

// Function to fetch prediction histories
const getPredictionHistories = async (req, res) => {
    try {
        const snapshot = await db.collection('predictions').get();

        if (snapshot.empty) {
            return res.status(404).json({
                status: 'success',
                data: []
            });
        }

        const histories = [];
        snapshot.forEach(doc => {
            const history = doc.data();
            const formattedHistory = {
                id: doc.id,
                history: {
                    result: history.result,
                    createdAt: history.createdAt,
                    suggestion: history.suggestion,
                    id: doc.id
                }
            };
            histories.push(formattedHistory);
        });

        return res.status(200).json({
            status: 'success',
            data: histories
        });
    } catch (error) {
        console.error("Error fetching histories", error);
        return res.status(500).json({
            status: 'fail',
            message: 'Terjadi kesalahan dalam mengambil riwayat prediksi'
        });
    }
};

module.exports = {
    predictCancer,
    getPredictionHistories
};
