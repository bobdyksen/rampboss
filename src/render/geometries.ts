import * as THREE from "three";
import type { AircraftType, VehicleType } from "../sim/types";

function mat(color: string, extras: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.12, ...extras });
}

export function createAircraftMesh(type: AircraftType, livery: string): THREE.Group {
  const group = new THREE.Group();
  group.name = `aircraft-${type.id}`;

  const fuselageLen = type.length * 0.92;
  const fuselage = new THREE.Mesh(
    new THREE.CapsuleGeometry(type.height * 0.22, fuselageLen * 0.72, 6, 12),
    mat(livery),
  );
  fuselage.rotation.x = Math.PI / 2;
  fuselage.castShadow = true;
  group.add(fuselage);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(type.height * 0.08, type.height * 0.16, fuselageLen * 0.7),
    mat(type.colorSecondary),
  );
  stripe.position.set(type.height * 0.16, type.height * 0.08, 0);
  group.add(stripe);

  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(type.wingspan, 0.18, type.length * 0.22),
    mat("#d7dde6"),
  );
  wing.position.set(0, -0.15, type.length * 0.04);
  wing.castShadow = true;
  group.add(wing);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, type.height * 0.72, type.length * 0.16), mat(livery));
  tail.position.set(0, type.height * 0.28, -type.length * 0.36);
  group.add(tail);

  const hstab = new THREE.Mesh(new THREE.BoxGeometry(type.wingspan * 0.36, 0.12, type.length * 0.1), mat("#d7dde6"));
  hstab.position.set(0, type.height * 0.18, -type.length * 0.38);
  group.add(hstab);

  const engineY = -0.55;
  const engineZ = type.length * 0.02;
  const engineX = type.wingspan * 0.28;
  for (const x of [-engineX, engineX]) {
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 2.4, 10), mat("#2b3340"));
    engine.rotation.x = Math.PI / 2;
    engine.position.set(x, engineY, engineZ);
    group.add(engine);
  }

  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(type.height * 0.2, 10, 8, 0, Math.PI),
    mat("#7ec8ff", { roughness: 0.2, metalness: 0.4 }),
  );
  cockpit.position.set(0, 0.15, fuselageLen * 0.38);
  group.add(cockpit);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat("#ff2d2d", { emissive: "#ff2d2d", emissiveIntensity: 0.8 }));
  beacon.name = "beacon";
  beacon.position.set(0, type.height * 0.42, 0);
  group.add(beacon);

  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), mat("#ff3355", { emissive: "#ff3355" }));
  navL.position.set(-type.wingspan * 0.48, 0, type.length * 0.04);
  group.add(navL);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), mat("#3ee0a0", { emissive: "#3ee0a0" }));
  navR.position.set(type.wingspan * 0.48, 0, type.length * 0.04);
  group.add(navR);

  return group;
}

export function createVehicleMesh(type: VehicleType, color: string): THREE.Group {
  const group = new THREE.Group();
  group.name = `vehicle-${type}`;
  const bodyMat = mat(color);
  const dark = mat("#20262e");

  if (type === "fuel_truck") {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.5), bodyMat);
    cab.position.set(0, 0.9, -1.3);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 3.2, 12), bodyMat);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, 0.9, 0.9);
    group.add(cab, tank);
  } else if (type === "belt_loader") {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 2.6), bodyMat);
    chassis.position.y = 0.4;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 3.2), mat("#222"));
    belt.rotation.x = -0.45;
    belt.position.set(0, 1.1, 0.4);
    belt.name = "belt";
    group.add(chassis, belt);
  } else if (type === "baggage_tractor") {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.6), bodyMat);
    cab.position.set(0, 0.75, -1.1);
    const cart = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 2.2), dark);
    cart.position.set(0, 0.5, 1.3);
    cart.name = "cart";
    group.add(cab, cart);
  } else if (type === "cleaning_van") {
    const van = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.6, 3.1), bodyMat);
    van.position.y = 0.95;
    group.add(van);
  } else {
    const tug = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 2.4), bodyMat);
    tug.position.y = 0.5;
    const hitch = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.8), dark);
    hitch.position.set(0, 0.4, -1.5);
    group.add(tug, hitch);
  }

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });
  return group;
}

export function createJetBridge(): THREE.Group {
  const group = new THREE.Group();
  const tunnel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 10), mat("#c5d0dc"));
  tunnel.position.set(0, 2.4, 5);
  tunnel.name = "tunnel";
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 2.6), mat("#9aa8b8"));
  cabin.position.set(0, 2.5, 10.4);
  cabin.name = "cabin";
  group.add(tunnel, cabin);
  return group;
}

export function createBagMesh(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.28, 0.5),
    mat(["#8e44ad", "#2980b9", "#16a085", "#c0392b", "#2c3e50"][Math.floor(Math.random() * 5)]),
  );
  mesh.castShadow = true;
  return mesh;
}
