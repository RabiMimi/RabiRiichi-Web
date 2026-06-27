import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SpinningCube } from './scene/SpinningCube.tsx';
import './App.css';

function App(): React.JSX.Element {
  return (
    <div className="app">
      <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <SpinningCube />
        <gridHelper args={[10, 10]} />
        <OrbitControls />
      </Canvas>
      <div className="overlay">
        <h1>RabiRiichi</h1>
        <p>3D web client scaffold — three.js via react-three-fiber.</p>
      </div>
    </div>
  );
}

export default App;
