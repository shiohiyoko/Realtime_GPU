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


__global__ void Gaussian(const cv::cuda::PtrStep<uchar3> input, cv::cuda::PtrStep<uchar3> output, int width, int height, float *kernel, int kernel_size) {

    __shared__ uchar3 tile[BLOCK_SIZE+5][BLOCK_SIZE+5];

    // Calculate thread and block indices
    int tx = threadIdx.x;
    int ty = threadIdx.y;
    int bx = blockIdx.x;
    int by = blockIdx.y;

    // Calculate global indices
    int row = by * blockDim.y + ty;
    int col = bx * blockDim.x + tx;

    // Calculate the offset of the center pixel of the kernel
    int offset = kernel_size / 2;

    // Load input pixels into shared memory
    if (row < height && col < width) {
        tile[ty][tx] = input(row, col);
    } else {
        tile[ty][tx].x = 0;
        tile[ty][tx].y = 0;
        tile[ty][tx].z = 0;
    }

    __syncthreads();
    
    // Apply the Gaussian filter to the shared memory tile
    if (ty-offset <= BLOCK_SIZE && tx-offset <= BLOCK_SIZE 
        && 0 <= ty-offset && 0 <= tx-offset
        && row < height && col < width) {
        float3 sum = make_float3(0.0);
        for (int i = -offset; i < offset+1; i++) {
            for (int j = -offset; j < offset+1; j++) {
                sum.x += kernel[(i+offset) * kernel_size + j+offset] * float(tile[ty + i][tx + j].x);
                sum.y += kernel[(i+offset) * kernel_size + j+offset] * float(tile[ty + i][tx + j].y);
                sum.z += kernel[(i+offset) * kernel_size + j+offset] * float(tile[ty + i][tx + j].z);
            }
        }
        output(row,col).x =  uchar(sum.x*10);
        output(row,col).y =  uchar(sum.y*10);
        output(row,col).z =  uchar(sum.y*10);
    }
}


int divUp(int a, int b) { 
  	return ((a % b) != 0) ? (a / b + 1) : (a / b);
}

void GaussianBlur (const cv::cuda::GpuMat& src, cv::cuda::GpuMat& dst, float sigma, int kernel) {
	const dim3 block(BLOCK_SIZE, BLOCK_SIZE);
	const dim3 grid(divUp(dst.cols, block.x), divUp(dst.rows, block.y));
    float h_gaussian[kernel*kernel];
    float* d_gaussian;
    size_t array_size = kernel*kernel*sizeof(float);
    int ks2 = kernel/2;
    float A = 1.0/(2.0*3.1415926*sigma*sigma);

    float sum_weight = 0.0;
    std::cout << "gaussian filter" << std::endl;
    for(int w=-ks2; w<ks2+1; w++){
        for(int h=-ks2; h<ks2+1; h++){
            h_gaussian[(w+ks2)*kernel+(h+ks2)] = A*exp(-(w*w+h*h)/(2.0*sigma*sigma));
            sum_weight += h_gaussian[(w+ks2)*kernel+(h+ks2)];
            std::cout<< h_gaussian[(w+ks2)*kernel+(h+ks2)] << " ";
        }
        std::cout<<std::endl;
    }
    std::cout<<std::endl;

    cudaMalloc((void **)&d_gaussian, array_size);
    cudaMemcpy(d_gaussian, h_gaussian, array_size, cudaMemcpyHostToDevice);

	Gaussian<<<grid, block>>>(src, dst, dst.cols, dst.rows, d_gaussian, kernel);
}

