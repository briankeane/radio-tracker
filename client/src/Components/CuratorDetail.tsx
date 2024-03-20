import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { styled } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import axios from "axios";

interface CuratorTrack {
    id: string
    track: Track
    status: string
}

interface Track {
    spotify_id: string
    album: string
    artist: string
    duration_ms: number
    isrc: string
    title: string
    popularity: number
    spotify_image_link: string
}

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

function CuratorDetail() {
  const [curatorTracks, setCuratorTracks] = useState<CuratorTrack[]>([]);

  const { curatorId } = useParams();

  useEffect(() => {
    const fetchCurators = async () => {
      const result = await axios.get(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/v1/curators/${curatorId}/curatorTracks`
      );
      console.log(result);
      if (!result?.data?.length) {
        const result = await axios.post(
          `${import.meta.env.VITE_BACKEND_BASE_URL}/v1/curators/${curatorId}/refreshCuratorTracks`
        );
        setCuratorTracks(result.data);
      }
      setCuratorTracks(result.data);
    };
    fetchCurators();
  }, [curatorId]);

  return (
    <div className="CuratorDetail">
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 700 }} aria-label="customized table">
          <TableHead>
            <TableRow>
              <StyledTableCell>Title</StyledTableCell>
              <StyledTableCell align="right">Artist</StyledTableCell>
              <StyledTableCell align="right">Popularity</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {curatorTracks.map((curatorTrack) => (
              <StyledTableRow key={curatorTrack.id}>
                <StyledTableCell component="th" scope="row">
                  {curatorTrack.track.title}
                </StyledTableCell>
                <StyledTableCell align="right">
                  {curatorTrack.track.artist}
                </StyledTableCell>
                <StyledTableCell align="right">
                  {curatorTrack.track.popularity}
                </StyledTableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default CuratorDetail;
