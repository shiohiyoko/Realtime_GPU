#ifndef COORDSYSTEM
#define COORDSYSTEM

#include <iostream>
#include <cuda.h>

typedef struct{
    float theta;
    float phi;
    float rho;

    void convSphere(const float3 cartesian_coord){
        rho = sqrt(pow(cartesian_coord.x,2.0) + pow(cartesian_coord.y,2.0) + pow(cartesian_coord.z,2.0));
        theta = atan2(cartesian_coord.y, cartesian_coord.x);
        phi = acos( cartesian_coord.z/out_coord.x );
    }
}SphereCoord;

typedef struct{
    float u;
    float v;

    void convUV(const SphereCoord sphere_coord){
        u = spherical_coord.theta/(2.0*3.1415926);
        v = spherical_coord.phi/3.1415926;

        if(u < 0.0){
            u = 1.0 + u;
        }
        if(v < 0.0){
            v = 1.0 + v;
        }
    }
}

#endif