#include<stdio.h>
#include<stdlib.h>
#include <opencv2/opencv.hpp>
#include <cfloat>
#include <opencv2/core/cuda/common.hpp>
#include <opencv2/core/cuda/border_interpolate.hpp>
#include <opencv2/core/cuda/vec_traits.hpp>
#include <opencv2/core/cuda/vec_math.hpp>

#include "./helper_math.h"

#define BLOCK_SIZE 16
#define PI 3.1415926

__device__ float2 projectX(float2 sph_coord, int xx){

    float3 coord = make_float3(0.0);
    coord.x = float(xx)*0.5;
    float rho = coord.x/(cos(sph_coord.x) * sin(sph_coord.y));
    coord.y = rho*sin(sph_coord.x)*sin(sph_coord.y);
    coord.z = rho*cos(sph_coord.y);

    float2 coord2d = make_float2(0.0);
    coord2d.x = coord.y*float(xx)+0.5;
    coord2d.y = 1.0-(coord.z+0.5);
    return coord2d;
}

__device__ float2 projectY(float2 sph_coord, int yy){

    float3 coord = make_float3(0.0);
    coord.y = float(yy)*0.5;
    float rho = coord.y/(sin(sph_coord.x) * sin(sph_coord.y));
    coord.x = rho*cos(sph_coord.x)*sin(sph_coord.y);
    coord.z = rho*cos(sph_coord.y);

    float2 coord2d = make_float2(0.0);
    coord2d.x = -coord.x * float(yy)+0.5;
    coord2d.y = 1.0-(coord.z + 0.5);
    return coord2d;
}

__device__ float2 projectZ(float2 sph_coord, int zz){

    float3 coord = make_float3(0.0);
    coord.z = float(zz)*0.5;
    float rho = coord.z/(cos(sph_coord.y));
    coord.x = rho*cos(sph_coord.x)*sin(sph_coord.y);
    coord.y = rho*sin(sph_coord.x)*sin(sph_coord.y);

    float2 coord2d = make_float2(0.0);
    coord2d.x = -coord.y * float(zz)+0.5;
    coord2d.y = 1.0-(coord.x + 0.5);
    return coord2d;
}


// create the coordinate for each cube 
// find the coordinate and project based on the spherical coordinate is facing
__device__ float2 project(int cols, int rows, float2 sph_coord){

    float2 face_size = make_float2(float(cols)/3.0, float(rows)/2.0); 

    float x = cos(sph_coord.x)*sin(sph_coord.y);
    float y = sin(sph_coord.x)*sin(sph_coord.y);
    float z = cos(sph_coord.y);

    float max_val = fmaxf(fmaxf(abs(x),abs(y)),abs(z));
    int xx = int(x/max_val);
    int yy = int(y/max_val);
    int zz = int(z/max_val);


    float2 coord = make_float2(0.0);
    if(abs(xx) == 1){
        float2 uv = projectX(sph_coord, xx);
        if(xx == 1){
            coord.x = face_size.x + uv.x*face_size.x;
            coord.y = uv.y*face_size.y;
        }else{
            coord.x = uv.x*face_size.x;
            coord.y = face_size.y + uv.y*face_size.y;
        }
            // printf("u: %0.4f, v: %0.4f\n", coord.x, coord.y);
    }
    else if(abs(yy) == 1){
        float2 uv = projectY(sph_coord, yy);
        // printf("u: %0.4f, v: %0.4f\n", uv.x, uv.y);
        if(yy == 1){
            coord.x = face_size.x*2.0 + uv.x*face_size.x;
            coord.y = uv.y*face_size.y;
        }else{
            coord.x = uv.x*face_size.x;
            coord.y = uv.y*face_size.y;
        }
    }
    else if(abs(zz) == 1){
        float2 uv = projectZ(sph_coord, zz);
        // printf("u: %0.4f, v: %0.4f\n", uv.x, uv.y);
        if(zz == 1){
            coord.x = face_size.x*2.0 + uv.x*face_size.x;
            coord.y = face_size.y + uv.y*face_size.y;
        }else{
            coord.x = face_size.x + uv.x*face_size.x;
            coord.y = face_size.y + uv.y*face_size.y;
        }
    }

    return coord;
}

__global__ void genEquirect(const cv::cuda::PtrStep<uchar3> src, cv::cuda::PtrStep<uchar3> dst, const int cols, const int rows, const int src_cols, const int src_rows){
    int tx = threadIdx.x;
    int ty = threadIdx.y;

    int bx = blockIdx.x;
    int by = blockIdx.y;

    int x = blockDim.x * bx + tx;
    int y = blockDim.y * by + ty;

    // spherical coordinates
    if(x < cols && y < rows){

        float2 uv = make_float2(float(x)/float(cols), float(y)/float(rows));
        float theta = uv.x*2*PI;
        float phi = uv.y*PI;
        float2 spherical_coord = make_float2(theta, phi);
        float2 coord = project(src_cols, src_rows, spherical_coord);
        
        // dst(y, x) = src(int(coord.y), int(coord.x));
        dst(y, x).x = coord.y*255;
        // dst(y, x) = src(y,x);
    }
}

void convCube2Equi(const cv::cuda::GpuMat& src, cv::cuda::GpuMat& dst){
    const dim3 block_size(BLOCK_SIZE, BLOCK_SIZE);
    const dim3 grid_size((dst.cols+block_size.x-1)/block_size.x, (dst.rows+block_size.y-1)/block_size.y);
    genEquirect<<<grid_size, block_size>>>(src, dst, dst.cols, dst.rows, src.cols, src.rows);
}