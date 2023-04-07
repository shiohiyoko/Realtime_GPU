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

__device__ float3 genCartesian(const int2 img_coord, const int cols, const int rows){
    
    float3 out_coord = make_float3(0.0);
    int2 face_size = make_int2(cols/3, rows/2);

    // define the position of the face
    // +-------+-------+-------+
	// | Y-(0) | X+(1) | Y+(2) |
	// +-------+-------+-------+
	// | X-(3) | Z-(4) | Z+(5) |
	// +-------+-------+-------+
    int face = (img_coord.y/face_size.y)*3 + img_coord.x/face_size.x;
    float2 norm_coord = make_float2(0.0);
    norm_coord = fmodf(make_float2(img_coord), make_float2(face_size)) / make_float2(face_size);
    norm_coord.x -= 0.5;
    norm_coord.y = 0.5 - norm_coord.y;
    
    if(face == 0){//Y-
        out_coord.x = norm_coord.x;
        out_coord.y = -0.5;
        out_coord.z = norm_coord.y;
    }else if(face == 1){//X+
        out_coord.x = 0.5;
        out_coord.y = norm_coord.x;
        out_coord.z = norm_coord.y;
    }else if(face == 2){//Y+
        out_coord.x = -norm_coord.x;
        out_coord.y = 0.5;
        out_coord.z = norm_coord.y;
    }else if(face == 3){//X-
        out_coord.x = -0.5;
        out_coord.y = -norm_coord.x;
        out_coord.z = norm_coord.y;
    }else if(face == 4){//Z-
        out_coord.x = norm_coord.y;
        out_coord.y = norm_coord.x;
        out_coord.z = -0.5;
    }else if(face == 5){//Z+
        out_coord.x = -norm_coord.y;
        out_coord.y = norm_coord.x;
        out_coord.z = 0.5;
    }

    return out_coord;
}

__device__ float3 getSpherical(const float3 cartesian_coord){

    float3 out_coord = make_float3(0.0);
    out_coord.x = sqrt(pow(cartesian_coord.x,2.0) + pow(cartesian_coord.y,2.0) + pow(cartesian_coord.z,2.0));
    //theta
    out_coord.y = atan2(cartesian_coord.y, cartesian_coord.x);
    out_coord.z = acos( cartesian_coord.z/out_coord.x );

    return out_coord;
}

__device__ float2 gen2DCartesian(const float3 spherical_coord){
    
    float2 out_coord = make_float2(0.0);
    out_coord.x = spherical_coord.y/(2.0*PI);
    out_coord.y = spherical_coord.z/PI;

    if(out_coord.x < 0.0){
        out_coord.x = 1.0 + out_coord.x;
    }
    if(out_coord.y < 0.0){
        out_coord.y = 1.0 + out_coord.y;
    }
    return out_coord;
}

__global__ void genCube(const cv::cuda::PtrStep<uchar3> src, cv::cuda::PtrStep<uchar3> dst, const int cols, const int rows, const int src_cols, const int src_rows){
    int tx = threadIdx.x;
    int ty = threadIdx.y;

    int bx = blockIdx.x;
    int by = blockIdx.y;

    int2 img_coord = make_int2(0);
    img_coord.x = blockDim.x * bx + tx;
    img_coord.y = blockDim.y * by + ty;

    // spherical coordinates
    if(img_coord.x < cols && img_coord.y < rows){
        
        // x,y,z,w  w is for definition to which face the coordinate is based
        float3 cartesian_coord = genCartesian(img_coord, cols, rows);
        float3 spherical_coord = getSpherical(cartesian_coord);
        float2 uv = gen2DCartesian(spherical_coord);
        
        dst(img_coord.y, img_coord.x) = src(int(uv.y*float(src_rows)), int(uv.x*float(src_cols)));
    }
}

void convEqui2Cube(const cv::cuda::GpuMat& src, cv::cuda::GpuMat& dst){
    const dim3 block_size(BLOCK_SIZE, BLOCK_SIZE);
    const dim3 grid_size((dst.cols+block_size.x-1)/block_size.x, (dst.rows+block_size.y-1)/block_size.y);
    genCube<<<grid_size, block_size>>>(src, dst, dst.cols, dst.rows, src.cols, src.rows);
}