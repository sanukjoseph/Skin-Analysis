import React, { useRef, useCallback, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

// MUI
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

// --- Constants ---
const WASM_FILES_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const FACE_DETECTION_MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"; // Using BlazeFace model via MediaPipe
const MIN_DETECTION_CONFIDENCE = 0.5; // Minimum confidence score
const THRESHOLD_PERCENT_FACE = 0.15; // Minimum face area percentage (adjust as needed)

// --- Helper: Get Window Dimensions ---
function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return { width, height };
}

function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return windowDimensions;
}

// --- Webcam Component ---
const WebcamCapture = ({ setImageSrc }) => {
  const webcamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const faceDetectorRef = useRef(null); // Ref to hold the initialized detector
  const lastVideoTimeRef = useRef(-1); // Track last processed frame time

  const [detectorInitializing, setDetectorInitializing] = useState(true);
  const [detectionStatus, setDetectionStatus] = useState("Initializing Detector...");
  const [isCamReady, setIsCamReady] = useState(false);

  // --- Calculate Webcam Dimensions ---
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const aspectRatio = 4 / 3;
  let camWidth, camHeight;

  if (windowHeight > windowWidth) {
    camWidth = Math.round(windowWidth * 0.9);
    camHeight = Math.round(camWidth / aspectRatio);
  } else {
    camHeight = Math.round(windowHeight * 0.8);
    camWidth = Math.round(camHeight * aspectRatio);
  }

  const videoConstraints = {
    width: camWidth,
    height: camHeight,
    facingMode: "user",
  };

  // --- Initialize MediaPipe Face Detector ---
  useEffect(() => {
    const initializeFaceDetector = async () => {
      try {
        console.log("Creating FilesetResolver...");
        const vision = await FilesetResolver.forVisionTasks(WASM_FILES_PATH);
        console.log("Creating FaceDetector...");
        faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: FACE_DETECTION_MODEL_PATH,
            delegate: "GPU", // Use GPU if available, fallback to CPU
          },
          runningMode: "VIDEO", // Important for processing video streams
          minDetectionConfidence: MIN_DETECTION_CONFIDENCE,
        });
        console.log("FaceDetector initialized successfully.");
        setDetectorInitializing(false);
        setDetectionStatus("Point camera at face");
      } catch (error) {
        console.error("Error initializing FaceDetector:", error);
        setDetectionStatus("Detector Init Error");
        setDetectorInitializing(false); // Stop showing initializing state on error
      }
    };

    initializeFaceDetector();

    // Cleanup function
    return () => {
      console.log("Closing FaceDetector...");
      faceDetectorRef.current?.close();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // Run only once on mount

  // --- Face Detection Loop ---
  const runFaceDetectionLoop = useCallback(() => {
    if (!faceDetectorRef.current || detectorInitializing || !isCamReady || !webcamRef.current?.video) {
      // If detector/cam not ready, request next frame and exit
      animationFrameRef.current = requestAnimationFrame(runFaceDetectionLoop);
      return;
    }

    const video = webcamRef.current.video;
    // Ensure video is playing and has data
    if (video.paused || video.ended || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(runFaceDetectionLoop);
      return;
    }

    // Only process if the video time has changed
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;

      try {
        // Detect faces using the video stream mode
        const detectionsResult = faceDetectorRef.current.detectForVideo(video, performance.now());

        if (detectionsResult && detectionsResult.detections) {
          const detections = detectionsResult.detections;
          const numFaces = detections.length;

          if (numFaces === 0) {
            setDetectionStatus("No face detected");
          } else if (numFaces > 1) {
            setDetectionStatus("Multiple faces detected");
          } else {
            // One face detected
            const detection = detections[0];
            const bbox = detection.boundingBox; // BoundingBox object
            const score = detection.categories[0]?.score || 0; // Confidence score

            if (!bbox) {
              setDetectionStatus("Detection Error (no bbox)");
              animationFrameRef.current = requestAnimationFrame(runFaceDetectionLoop);
              return;
            }

            // Calculate face area percentage
            const faceWidth = bbox.width;
            const faceHeight = bbox.height;
            const boxArea = faceWidth * faceHeight;
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
            const imageArea = videoWidth * videoHeight;
            const percentFace = imageArea > 0 ? boxArea / imageArea : 0;

            // console.log(`MediaPipe Web - Score: ${score.toFixed(3)}, Face Area %: ${percentFace.toFixed(2)}`); // Debugging

            if (percentFace < THRESHOLD_PERCENT_FACE) {
              setDetectionStatus("Come closer");
            } else if (score < MIN_DETECTION_CONFIDENCE) {
              // This check might be redundant due to detector config, but good for clarity
              setDetectionStatus("Detection confidence low");
            } else {
              setDetectionStatus("OK"); // All conditions met
            }
          }
        } else {
          // No detections in the result object
          setDetectionStatus("No face detected");
        }
      } catch (error) {
        console.error("Error during MediaPipe detection:", error);
        setDetectionStatus("Detection Error");
        // Consider stopping the loop on persistent errors
      }
    }

    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(runFaceDetectionLoop);
  }, [detectorInitializing, isCamReady]); // Dependencies

  // --- Start/Stop Detection Loop ---
  useEffect(() => {
    // Start loop only when detector is ready and cam is ready
    if (!detectorInitializing && isCamReady) {
      console.log("Starting face detection loop (MediaPipe Web).");
      // Reset last video time to start processing immediately
      lastVideoTimeRef.current = -1;
      animationFrameRef.current = requestAnimationFrame(runFaceDetectionLoop);
    } else {
      // Stop loop if detector or cam becomes not ready
      if (animationFrameRef.current) {
        console.log("Stopping face detection loop (detector/cam not ready).");
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    // Cleanup loop on unmount or when dependencies change
    return () => {
      if (animationFrameRef.current) {
        console.log("Stopping face detection loop (cleanup).");
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [detectorInitializing, isCamReady, runFaceDetectionLoop]);

  // --- Webcam Event Handlers ---
  const handleUserMedia = () => {
    console.log("Webcam stream started.");
    setIsCamReady(true);
    if (!detectorInitializing) {
      setDetectionStatus("Point camera at face");
    }
  };

  const handleUserMediaError = (error) => {
    console.error("Webcam error:", error);
    setDetectionStatus("Webcam access denied or error");
    setIsCamReady(false);
  };

  // --- Capture Final Photo ---
  const capture = useCallback(() => {
    if (webcamRef.current && detectionStatus === "OK") {
      const finalImageSrc = webcamRef.current.getScreenshot({ width: videoConstraints.width, height: videoConstraints.height });
      if (finalImageSrc) {
        console.log("Final screenshot captured.");
        setImageSrc(finalImageSrc);
      } else {
        console.error("Failed to capture final screenshot.");
        setDetectionStatus("Capture failed");
      }
    } else {
      console.warn("Capture attempted but conditions not met (Status OK?). Current status:", detectionStatus);
    }
  }, [webcamRef, detectionStatus, setImageSrc, videoConstraints]);

  // --- Render ---
  return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
      {/* Display Status */}
      <Typography variant="h5" component="div" textAlign="center" minHeight="2em">
        {detectorInitializing ? (
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={20} /> Initializing Detector...
          </Box>
        ) : isCamReady ? (
          detectionStatus
        ) : (
          "Waiting for Webcam..."
        )}
      </Typography>

      {/* Webcam Display */}
      <Box sx={{ width: camWidth, height: camHeight, position: "relative", border: "1px solid grey", overflow: "hidden" }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          width={camWidth}
          height={camHeight}
          videoConstraints={videoConstraints}
          screenshotFormat="image/jpeg"
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          mirrored={true} // Visual mirroring
        />
      </Box>

      {/* Capture Button */}
      <Button
        onClick={capture}
        variant="contained"
        disabled={detectorInitializing || !isCamReady || detectionStatus !== "OK"}
        fullWidth
        sx={{ mt: 1 }}
      >
        Capture photo
      </Button>
    </Box>
  );
};

export default WebcamCapture;
