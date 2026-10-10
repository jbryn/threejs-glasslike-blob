uniform float uTime;
uniform float uRadius;
uniform float uStrength;
uniform float uFrequency;
uniform float uSpeed;

// Point on the blob surface along a unit direction from its centre
vec3 blobSurface(vec3 direction)
{
    vec3 p = direction * uFrequency + vec3(uTime * uSpeed, 1.0, 0.0);
    float n = snoise(p) + 0.2 * snoise(p * 2.0 + 7.3);

    return direction * (uRadius + uStrength * n);
}

// Displaced position and its normal, taken from two nearby points on the surface
void blob(vec3 direction, out vec3 blobPosition, out vec3 blobNormal)
{
    const float epsilon = 0.001;

    vec3 up = abs(direction.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent = normalize(cross(direction, up));
    vec3 bitangent = cross(direction, tangent);

    blobPosition = blobSurface(direction);
    vec3 neighbourA = blobSurface(normalize(direction + tangent * epsilon));
    vec3 neighbourB = blobSurface(normalize(direction + bitangent * epsilon));

    blobNormal = normalize(cross(neighbourA - blobPosition, neighbourB - blobPosition));
}
