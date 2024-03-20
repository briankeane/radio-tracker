import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

function CuratorSignIn() {
  return (
    <div style={{ backgroundColor: 'black', justifyContent: 'center'}}>
      <Typography align='center'>
      <a href={`${import.meta.env.VITE_BACKEND_BASE_URL}/v1/auth/spotify/authorize`}>
        <Button
        style={{
          borderRadius: 35,
          backgroundColor: "#DC625C",
          padding: "18px 36px",
          fontSize: "35px"
      }}
          color='primary'
          size='large'
          type='submit'
          variant='contained'
          sx={{mt: 10}}
        >
          Sign In
        </Button>
        </a>
  </Typography>
    </div>
  )
}

export default CuratorSignIn
