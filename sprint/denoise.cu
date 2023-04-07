#include<stdio.h>
#include<stdlib.h>
#include <opencv2/opencv.hpp>
#include <cfloat>
#include <opencv2/core/cuda/common.hpp>
#include <opencv2/core/cuda/border_interpolate.hpp>
#include <opencv2/core/cuda/vec_traits.hpp>
#include <opencv2/core/cuda/vec_math.hpp>

#include "./helper_math.h"

__device__ uchar3 Gaussian(const int x, const int y, 
                            const cv::cuda::PtrStep<uchar3> src, 
                            float* gaussian, int ks2, 
                            int cols, int rows){
    
    uchar3 output = make_uchar3(0,0,0);
    float3 filtered = make_float3(0.0);
    float sum_weight = 0.0;

    for(int i=0; i<(2*ks2+1)*(2*ks2+1); i++)
        sum_weight += gaussian[i];

    for(int ky=-ks2; ky<ks2+1; ky++){
        for(int kx=-ks2; kx<ks2+1; kx++){

            int dx = x+kx;
            int dy = y+ky;
            if(dx < 0)
                dx = -dx;
            else if(dx > cols)
                dx = 2*(cols) - dx;
            
            if(dy < 0)
                dy = -dy;
            else if(dy > rows)
                dy = 2*rows - dy;
            
            filtered.x += float(src(dy, dx).x) * gaussian[(2*ks2+1)*(kx+ks2)+ky+ks2]/sum_weight;
            filtered.y += float(src(dy, dx).y) * gaussian[(2*ks2+1)*(kx+ks2)+ky+ks2]/sum_weight;
            filtered.z += float(src(dy, dx).z) * gaussian[(2*ks2+1)*(kx+ks2)+ky+ks2]/sum_weight;
        }
    }
    
    output.x = uchar(filtered.x);
    output.y = uchar(filtered.y);
    output.z = uchar(filtered.z);
    return output;
}

__device__ float2 CovDeterminant(const cv::cuda::PtrStep<uchar3> src, int x, int y, int cols, int rows, const int neighbor, float alpha){
    
    float covariance[9];
    int n2 = neighbor/2;
    float3 mean = make_float3(0.0);
    size_t neighbor_size = neighbor*neighbor*3;
    float *deviation = new float[neighbor_size];

    int scope_size = 0;
    for(int nx = -n2; nx<n2+1; nx++){
        for(int ny = -n2; ny<n2+1; ny++){
            int dx = x+nx;
            int dy = y+ny;

            if( dx >= 0 && dx < cols && dy >= 0 && dy < rows){
                mean.x += float(src(dy, dx).x);
                mean.y += float(src(dy, dx).y);
                mean.z += float(src(dy, dx).z);
                scope_size++;
            }
        }
    }

    mean.x /= scope_size;
    mean.y /= scope_size;
    mean.z /= scope_size;

    // printf("mean: %f, %f, %f\n", mean.x, mean.y, mean.z);

    // calculate deviation
    for(int nx = -n2; nx<n2+1; nx++){
        for(int ny = -n2; ny<n2+1; ny++){
            int dx = x+nx;
            int dy = y+ny;

            if( dx >= 0 && dx < cols && dy >= 0 && dy < rows){
                // printf("idx %d, pixel %d\n", neighbor*(nx+n2)+ny+n2, dx);
                deviation[(neighbor*(nx+n2)+ny+n2)*3  ] = float(src(dy, dx).x) - mean.x;
                deviation[(neighbor*(nx+n2)+ny+n2)*3+1] = float(src(dy, dx).y) - mean.y;
                deviation[(neighbor*(nx+n2)+ny+n2)*3+2] = float(src(dy, dx).z) - mean.z;
            }
            else{
                deviation[(neighbor*(nx+n2)+ny+n2)*3  ] = 0.0; 
                deviation[(neighbor*(nx+n2)+ny+n2)*3+1] = 0.0;
                deviation[(neighbor*(nx+n2)+ny+n2)*3+2] = 0.0;
            }
        }
    }
    
    // calculate covariance
    for(int X=0; X<3; X++){
        for(int Y=0; Y<3; Y++){
            float sum = 0.0;
            
            for(int nx = -n2; nx<n2+1; nx++){
                for(int ny = -n2; ny<n2+1; ny++){

                    sum += deviation[neighbor*(nx+n2)+ny+n2+X]*deviation[neighbor*(nx+n2)+ny+n2+Y];
                }
            }

            covariance[Y*3+X] = sum/float(scope_size);
        }
    }

    // calculate the determinant of the covariance matrix
    float det = covariance[0]*covariance[4]*covariance[8] + covariance[1]*covariance[5]*covariance[6] + covariance[2]*covariance[3]*covariance[7]
               -(covariance[0]*covariance[5]*covariance[7] + covariance[1]*covariance[3]*covariance[8] + covariance[2]*covariance[4]*covariance[6]);
    
    float2 param = make_float2(0.0);
    float sigma = log10(abs(det)+10.0);
    float kernel = alpha*2 / sigma;

    delete[] deviation;
    param.x = sigma;
    param.y = kernel;
    return param;
}

__global__ void Denoise(const cv::cuda::PtrStep<uchar3> src, cv::cuda::PtrStep<uchar3> dst, 
                        const int neighbor, const int cols, const int rows, float alpha){
    const int dst_x = blockDim.x * blockIdx.x + threadIdx.x;
    const int dst_y = blockDim.y * blockIdx.y + threadIdx.y;

    // get matrix from neihbor 

	if (dst_x < cols && dst_y < rows) {
        // printf("x: %d, y:%d", dst_x, dst_y);
        float2 param = CovDeterminant(src, dst_x, dst_y, cols, rows, neighbor, alpha);
        // printf("sigma %f\n", sigma);
        float A = 1.0/(2.0*3.1415926*param.x*param.x);
        if(int(param.y)%2 == 0)
            param.y += 1.0;

        size_t kernel_size = int(param.y*param.y);
        
        // printf("kernel size: %d sigma %f \n", int(param.y), param.x);
        float *gaussian = new float[kernel_size];
        int n2 = int(param.y)/2;

        for(int w=-n2; w<n2+1; w++){
            for(int h=-n2; h<n2+1; h++){
                gaussian[(w+n2)*int(param.y)+(h+n2)] = A*exp(-(w*w+h*h)/(2.0*param.x*param.x));
            }
        }
        
		uchar3 val = Gaussian(dst_x, dst_y, src, gaussian, n2, cols, rows);
        // uchar3 val = src(dst_y, dst_x);
		dst(dst_y, dst_x).x = val.x;
		dst(dst_y, dst_x).y = val.y;
		dst(dst_y, dst_x).z = val.z;
        
        delete[] gaussian;
    }
}


int divUp(int a, int b) { 
  	return ((a % b) != 0) ? (a / b + 1) : (a / b);
}

void convDenoise(const cv::cuda::GpuMat& src, cv::cuda::GpuMat& dst, int neighbor, float alpha){
    const dim3 block(32,8);
    const dim3 grid(divUp(dst.cols, block.x), divUp(dst.rows, block.y));

    size_t size = 1024 * 1024 * 1024;
    cudaDeviceSetLimit(cudaLimitMallocHeapSize, size);

    Denoise<<<grid, block>>>(src, dst, neighbor, dst.cols, dst.rows, alpha);
}