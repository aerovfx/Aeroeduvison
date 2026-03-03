import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";

function PlaceholderMesh() {
  return (
    <mesh rotation={[0.4, 0.7, 0]}>
      <icosahedronGeometry args={[1.1, 1]} />
      <meshStandardMaterial color="#4fd1c5" metalness={0.25} roughness={0.2} />
    </mesh>
  );
}

export function ModelViewer({ modelPath }: { modelPath?: string }) {
  return (
    <section className="panel viewer-panel">
      <div className="panel-head">
        <h3>3D Viewer</h3>
        <span>{modelPath ? "Model ready" : "Preview mode"}</span>
      </div>

      <div className="viewer-canvas-wrap">
        <Canvas camera={{ position: [2.8, 2.2, 2.8], fov: 48 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <PlaceholderMesh />
          <Environment preset="city" />
          <OrbitControls makeDefault />
        </Canvas>
      </div>

      <p className="viewer-note">
        {modelPath
          ? `GLB path: ${modelPath}`
          : "Chưa có file 3D thật. Kết nối API Trellis/Hunyuan để lấy GLB/OBJ và load vào viewer."}
      </p>
    </section>
  );
}
