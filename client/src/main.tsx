import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ErrorPage from './Components/ErrorPage.tsx';
import Root from './Components/Root.tsx';
import CuratorDetail from './Components/CuratorDetail.tsx';
import './index.css';
import CuratorList from './Components/CuratorList.tsx';
import CuratorSignIn from './Components/CuratorSignIn.tsx';
import CuratorSignedIn from './Components/CuratorSignedIn.tsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
        {
          path: "curatorSignIn",
          element: <CuratorSignIn />
        },
        {
          path: "curatorSignedIn",
          element: <CuratorSignedIn />
        },
      {
        path: "curators",
        element: <CuratorList />,
      },
      {
        path: "curators/:curatorId",
        element: <CuratorDetail />,
      }
    ]
  }
]);


ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <RouterProvider router={router} />
  </>,
)
