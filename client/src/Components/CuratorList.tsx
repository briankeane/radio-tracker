import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Button from "@mui/material/Button";
import axios from "axios";

interface Curator {
    id: string
    spotify_display_name: string
}

function CuratorList() {
  const [curators, setCurators] = useState([]);

  const fetchCurators = async () => {
    const result = await axios.get(`${import.meta.env.VITE_BACKEND_BASE_URL}/v1/curators`);
    setCurators(result.data);
  };

  useEffect(() => {
    fetchCurators();
  }, []);

  function curatorItem(curator: Curator) {
    return (
      <ListItem alignItems="flex-start">
        <Button
          component={Link}
          to={`/curators/${curator.id}`}
          variant="outlined"
          href="#outlined-buttons"
        >
          {curator.spotify_display_name}
        </Button>
      </ListItem>
    );
  }
  const curatorListItems = curators.map((curator) => curatorItem(curator));
  return (
    <List sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
      {curatorListItems}
    </List>
  );
}

export default CuratorList;
