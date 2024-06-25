const express = require('express');
const router = express.Router();
const predictionController = require('./controller');
const multer = require('multer');

// Multer storage configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to handle POST /predict
router.post('/predict', upload.single('image'), predictionController.predictCancer);

// Route to handle GET /predict/histories
router.get('/predict/histories', predictionController.getPredictionHistories);

module.exports = router;
