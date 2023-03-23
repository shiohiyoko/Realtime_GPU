#include<stdio.h>
#include<stdlib.h>
#include <opencv2/opencv.hpp>
#include <cfloat>
#include <opencv2/core/cuda/common.hpp>
#include <opencv2/core/cuda/border_interpolate.hpp>
#include <opencv2/core/cuda/vec_traits.hpp>
#include <opencv2/core/cuda/vec_math.hpp>

#include "helper_math.h"

__global__ void process(const cv::cuda::PtrStep<uchar3> l_src,
                        const cv::cuda::PtrStep<uchar3> l_src,
                        cv::cuda::PtrStep<uchar3> dst, int rows, int cols )
{
 
  const int dst_x = blockDim.x * blockIdx.x + threadIdx.x;
  const int dst_y = blockDim.y * blockIdx.y + threadIdx.y;
  
  if (dst_x < cols && dst_y < rows)
    {
      uchar3 val = src(dst_y, dst_x);
      dst(dst_y, dst_x).x = 255-val.x;
      dst(dst_y, dst_x).y = 255-val.y;
      dst(dst_y, dst_x).z = 255-val.z;
    }}

int divUp(int a, int b)
{
  return ((a % b) != 0) ? (a / b + 1) : (a / b);
}

void startCUDA ( cv::cuda::GpuMat& src, cv::cuda::GpuMat& dst )
{
  const dim3 block(32, 8);
  const dim3 grid(divUp(dst.cols, block.x), divUp(dst.rows, block.y));

  process<<<grid, block>>>(src, dst, dst.rows, dst.cols);

}

void AnaglyphEffect(const cv::cuda::GpuMat& l_src, const cv::cuda::GpuMat& l_src, cv::cuda::GpuMat& dst){
  const dim3 block(32, 8);
  const dim3 grid(divU(dst.cols, block.x), divUp(dst.rows, block.y));

  process<<<grid, block>>>(l_src, r_src, dst, dst.rows, dst.cols);
}

