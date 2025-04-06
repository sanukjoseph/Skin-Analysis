import React from "react";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea"; // Import CardActionArea
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip"; // Import Chip
import Box from "@mui/material/Box";

export default function ProductCard({
  name = "cream",
  price = 2000,
  brand = "brand",
  url = "https://www.myntra.com/",
  concern = [],
  image = "",
}) {
  const redirectProduct = () => {
    // Use window.open for potentially better UX (opens in new tab)
    // window.location.replace(url);
    window.open(url, "_blank", "noopener,noreferrer");
  };
  concern = [...new Set(concern)].filter((c) => c); // Ensure unique and non-empty concerns
  const placeholderImage = "/unavailable.png"; // Path relative to public folder

  return (
    // Use CardActionArea for click handling
    <Card sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <CardActionArea onClick={redirectProduct} sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <CardMedia
          component="img"
          height="200" // Use number or string like "200px" instead of "200vh"
          image={image || placeholderImage} // Use placeholder if image is falsy
          alt={name || "Product image"} // Use product name in alt text
          // Add error handling for image loading
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = placeholderImage;
          }}
          sx={{ objectFit: "contain" }} // Better image scaling
        />
        <CardContent sx={{ flexGrow: 1 }}>
          {/* Change component to 'div' to allow nesting the inner Typography div */}
          <Typography component="div" variant="body2" color="text.secondary" gutterBottom>
            {brand}
            <Typography component="div" color="text.primary" variant="inline" sx={{ float: "right", fontWeight: "bold" }}>
              {price}
            </Typography>
          </Typography>
          <Typography gutterBottom variant="h6" component="div" sx={{ mt: 1 }}>
            {" "}
            {/* Added margin top */}
            {name.length > 40 ? name.substring(0, 40) + "..." : name}
          </Typography>
          {/* Use Chips for concerns */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
            {concern.map((c) => (
              <Chip key={c} label={c} size="small" />
            ))}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
