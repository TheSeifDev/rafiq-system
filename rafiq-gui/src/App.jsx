import React from 'react';
import { useEffect } from 'react';
import { useAIStore } from './store/aiStore';
import Home from './pages/Home';

function App() {
  const { reset } = useAIStore();

  console.log('[App] Rendering...');

  useEffect(() => {
    console.log('[App] Mounted, resetting store...');
    reset();

    return () => {
      console.log('[App] Unmounting...');
    };
  }, [reset]);

  return (
    <React.Fragment>
      {console.log('[App] Rendering Home component...')}
      <Home />
    </React.Fragment>
  );
}

export default App;