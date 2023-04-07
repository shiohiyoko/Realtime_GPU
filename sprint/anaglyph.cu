#include <iostream>
#include"./helper_math.h"
#include<cuda.h>
#include <opencv2/core/cuda/common.hpp>
#include <opencv2/core/cuda/border_interpolate.hpp>
#include <opencv2/core/cuda/vec_traits.hpp>
#include <opencv2/core/cuda/vec_math.hpp>
#include <opencv2/opencv.hpp>
#include <cfloat>
#include<string>
#include "anaglyph_matrix.h"
#include "./helper_math.h"

__global__ void applyAnag(const cv::cuda::PtrStep<uchar3>& l_src, const cv::cuda::PtrStep<uchar3>& r_src, cv::cuda::PtrStep<uchar3>& dst, float* l_ana, float* r_ana){

	const int dst_x = blockDim.x * blockIdx.x + threadIdx.x;
	const int dst_y = blockDim.y * blockIdx.y + threadIdx.y;
    
	dst(dst_y, dst_x).x =  uchar(l_ana[0]*float(l_src(dst_y, dst_x).x) + l_ana[1]*float(l_src(dst_y, dst_x).y) + l_ana[2]*float(l_src(dst_y, dst_x).z)) + 
				           uchar(r_ana[0]*float(r_src(dst_y, dst_x).x) + r_ana[1]*float(r_src(dst_y, dst_x).y) + r_ana[2]*float(r_src(dst_y, dst_x).z));

	dst(dst_y, dst_x).y =  uchar(l_ana[3]*float(l_src(dst_y, dst_x).x) + l_ana[4]*float(l_src(dst_y, dst_x).y) + l_ana[5]*float(l_src(dst_y, dst_x).z)) + 
				           uchar(r_ana[3]*float(r_src(dst_y, dst_x).x) + r_ana[4]*float(r_src(dst_y, dst_x).y) + r_ana[5]*float(r_src(dst_y, dst_x).z));

	dst(dst_y, dst_x).z =  uchar(l_ana[6]*float(l_src(dst_y, dst_x).x) + l_ana[7]*float(l_src(dst_y, dst_x).y) + l_ana[8]*float(l_src(dst_y, dst_x).z)) + 
				           uchar(r_ana[6]*float(r_src(dst_y, dst_x).x) + r_ana[7]*float(r_src(dst_y, dst_x).y) + r_ana[8]*float(r_src(dst_y, dst_x).z));
}

void Anaglyph(const cv::cuda::GPUMat& l_src, const cv::cuda::GPUMat& r_src, const cv::cuda::GPUMat& dst, const std::char* type){

    float h_lmat[9], 
    float h_rmat[9];
    float *d_lmat;
    float *d_rmat;

    dim3 block(16,16);
    dim3 grid((dst.cols+block.x-1)/block.x, (dst.rows+block.y-1)/block.y);

    applyAnaglyph(h_lmat, h_rmat, type);
    cudaMalloc((void**)&d_lmat, sizeof(float)*9);
    cudaMemcpy(d_lmat, h_lmat, sizeof(float)*9, cudaMemcpyHostToDevice);

    applyAnag<<<grid, block>>>(l_src, r_src, d_lmat, d_rmat);

}
