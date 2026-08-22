import { IonApp, IonRouterOutlet } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Navigate, Route } from "react-router-dom";

import Home from "./pages/Home.tsx";

/**
 * React Router v6 syntax (`element=`, `<Navigate>`) — Ionic 9 requires
 * react-router >=6.4 <7. The v5 `component=`/`<Redirect>` form is gone.
 *
 * IonReactRouter replaces BrowserRouter; without it Ionic page transitions and
 * the native view stack do not work.
 */
export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route path="/home" element={<Home />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
}
