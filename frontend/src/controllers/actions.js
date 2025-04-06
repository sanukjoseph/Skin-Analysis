// Using native fetch API

export const UploadImage = async (imageSrc, navigate) => {
  try {
    const response = await fetch("/api/upload", {
      // Use relative path for Vite proxy
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: imageSrc }), // Send base64 string in JSON body
    });

    const data = await response.json(); // Always parse JSON, even for errors

    if (!response.ok) {
      // Check response status code for errors (e.g., 4xx, 5xx)
      console.error("Upload Error:", data.message || `HTTP error! status: ${response.status}`);
      // Optionally, display a user-friendly error message here
    } else {
      // Success case (status code 2xx)
      navigate("/form", { state: { data } });
      console.log("Upload Success:", data);
    }
  } catch (err) {
    // Catch network errors or issues with fetch/JSON parsing itself
    console.error("Upload Fetch Error:", err);
  }
};

export const putForm = async (features, currType, currTone, navigate) => {
  console.log("Submitting form:", features, currType, currTone);
  try {
    const response = await fetch("/api/recommend", {
      // Use relative path for Vite proxy
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        features: features,
        type: currType,
        tone: currTone,
      }),
    });

    const data = await response.json(); // Always parse JSON

    if (!response.ok) {
      console.error("Form Submit Error:", data.message || `HTTP error! status: ${response.status}`);
    } else {
      navigate("/recs", { state: { data } });
      console.log("Form Submit Success:", data);
    }
  } catch (err) {
    console.error("Form Submit Fetch Error:", err);
  }
};
