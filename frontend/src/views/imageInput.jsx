import React, { useState, useEffect } from "react";
import { UploadImage } from "../controllers/actions";
import { useNavigate } from "react-router-dom";

import WebcamCapture from "./Components/webCam";

// MUI
import Grid from "@mui/material/Grid";
import Container from "@mui/material/Container";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import Button from "@mui/material/Button";

function ImageInput() {
  const [landingPage, setLandingPage] = useState(true);
  const [imageSrc, setImageSrc] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (imageSrc !== null) {
      console.log("we got an image, uploading...");
      UploadImage(imageSrc, navigate);
    }
  }, [imageSrc, navigate]); // Add navigate to dependency array as it's used inside

  return (
    <>
      <Container maxWidth="xs" sx={{ padding: 0 }} alignitems="center">
        <Grid container justify="center" sx={{ maxHeight: "100vh" }} spacing={1}>
          {landingPage ? (
            <Grid item xs={6} sx={{ margin: "40vh auto" }} textAlign="center">
              <PhotoCameraIcon sx={{ fontSize: "5em" }} />
              <Button
                onClick={() => {
                  setLandingPage(false);
                }}
                variant="contained"
                fullWidth
              >
                Take a photo
              </Button>
            </Grid>
          ) : (
            <WebcamCapture setImageSrc={setImageSrc} />
          )}
        </Grid>
      </Container>
    </>
  );
}

export default ImageInput;
