# Repository structure

This repository contains three independently executable systems. Keep runtime code
inside its system boundary; put experiments, generated files, and delivery artefacts
outside of those boundaries.

```text
backend/                         Spring Boot microservices
  <service>/                     independently built and deployed Gradle project
  resources/                     shared database script and team notes
frontend/                        React/Vite client
  src/                           application source
  public/                        runtime-static assets (including 3D models)
  tools/mapbox/                  offline Mapbox conversion data and test pages
embedded/                        ROS integration
  catkin_ws/src/vanish/          the only active ROS package
  reference/ssafy_{1,2,3}/       preserved learning/reference packages; not built
results/, readimg/               project deliverables and README images
```

## Boundaries

- Do not add a ROS package to `embedded/catkin_ws/src` unless it is required by the
  Vanish runtime. Put samples and experiments under `embedded/reference`.
- `frontend/tools/mapbox` is an offline authoring workspace. Its JSON, GeoJSON,
  conversion scripts, and HTML inspection pages are intentionally excluded from the
  Vite application bundle.
- Each backend service has its own Gradle wrapper, Dockerfile, and Jenkinsfile.
  Build or deploy it from that service directory rather than from `backend/`.
- Generated outputs (`dist`, Gradle builds, Catkin build/devel/install/log folders),
  IDE metadata, and temporary React components must remain untracked.

## Common commands

```bash
# Frontend
cd frontend && npm run lint && npm run build

# A backend service (replace the service name as needed)
cd backend/member-service && ./gradlew test

# Active ROS workspace
cd embedded/catkin_ws && catkin_make
source devel/setup.bash
roslaunch vanish point_driving.launch
```
