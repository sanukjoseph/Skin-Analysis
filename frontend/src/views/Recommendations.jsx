import React from "react";

// MUI
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

import ProductCard from "./Components/ProductCard";
import { useLocation } from "react-router";

const Recommendations = () => {
  const { state } = useLocation();
  const { data } = state;
  const { general, makeup } = data;
  return (
    <>
      <Container sx={{ marginTop: "2vh", padding: 1 }} alignitems="center" width="inherit">
        <Typography gutterBottom variant="h4" component="div" marginTop="2vh" textAlign="center">
          Skin care
        </Typography>
        {Object.keys(general).map((type, products) => {
          // Add key={type} to the outer div
          return (
            <div key={type}>
              <Typography gutterBottom variant="h5" component="div" marginTop="2vh" color="text.secondary">
                {type}
              </Typography>
              <Grid container spacing={1}>
                {general[type].slice(0, 4).map((prod) => {
                  // Add key={prod.url} to the Grid item
                  return (
                    <Grid item xs={6} md={3} key={prod.url}>
                      <ProductCard
                        name={prod.name}
                        brand={prod.brand}
                        image={prod.img}
                        price={prod.price}
                        url={prod.url}
                        concern={prod.concern}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </div>
          );
        })}

        <Typography gutterBottom variant="h4" component="div" marginTop="4vh" marginBottom="2vh" textAlign="center">
          {" "}
          {/* Added marginBottom */}
          Make up
        </Typography>

        {/* Removed unused FormLabel and commented code */}
        <div>
          <Grid container spacing={1}>
            {makeup.map((prod) => {
              // Add key={prod.url} to the Grid item
              return (
                <Grid item xs={6} md={3} key={prod.url}>
                  <ProductCard
                    name={prod.name}
                    brand={prod.brand}
                    image={prod.img}
                    price={prod.price}
                    url={prod.url}
                    concern={prod.concern}
                  />
                </Grid>
              );
            })}
          </Grid>
        </div>
      </Container>
    </>
  );
};

export default Recommendations;
