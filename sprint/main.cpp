#include <iostream>
#include <opencv2/opencv.hpp>
#include <opencv2/cudawarping.hpp>
#include <chrono>  // for high_resolution_clock
#include <cuda.h>
#include <cuda_runtime.h>

using namespace std;

void convEqui2Cube (const cv::cuda::GpuMat& src,cv::cuda::GpuMat& dst);
void convCube2Equi (const cv::cuda::GpuMat& src,cv::cuda::GpuMat& dst);
// void GaussianBlur(const cv::cuda::GpuMat& src, cv::cuda::GpuMat& dst, float sigma, int kernel);
void convDenoise(const cv::cuda::GpuMat& src, cv::cuda::GpuMat& dst, int neighbor, float alpha);
// void Anaglyph(const cv::cuda::GPUMat& l_src, const cv::cuda::GPUMat& r_src, const cv::cuda::GPUMat& dst, const std::char* type);

int main( int argc, char** argv )
{
    cv::namedWindow("Original Image", cv::WINDOW_OPENGL | cv::WINDOW_AUTOSIZE);
    cv::namedWindow("Resized Image", cv::WINDOW_OPENGL | cv::WINDOW_AUTOSIZE);

    cv::Mat h_input = cv::imread("image-360.jpg");
    cv::resize(h_input, h_input, cv::Size(), 0.5, 0.5);
    cv::Mat h_cube(h_input.rows*1.1, h_input.cols*1.15, CV_8UC3);
    cv::Mat h_equirect(h_input.rows, h_input.cols, CV_8UC3);
    cv::Mat h_gaussianblur(h_input.rows, h_input.cols, CV_8UC3);
    
    cv::cuda::GpuMat d_input, d_cube, d_equirect, d_gaussianblur;

    d_input.upload(h_input);
    d_cube.upload(h_cube);
    d_equirect.upload(h_equirect);
    d_gaussianblur.upload(h_equirect);

    cout<<"input image"<< h_input.cols<<" "<< h_cube.rows<<endl;
    cout<<"cube map image"<<h_cube.cols<<" "<< h_cube.rows<<endl;
    cout<<"equirectangular image"<<h_equirect.cols<<" "<< h_equirect.rows<<endl;
    
    auto begin = chrono::high_resolution_clock::now();

    convEqui2Cube( d_input, d_cube );
    convCube2Equi( d_cube, d_equirect );
    convDenoise( d_equirect, d_gaussianblur, 21, 10);

    auto end = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> diff = end-begin;

    d_cube.download(h_cube);
    d_equirect.download(h_equirect);
    d_gaussianblur.download(h_gaussianblur);

    cv::imshow("Cubemap image", h_cube);
    cv::imshow("Equirectangular image", h_equirect);

    cv::imwrite("cubemap.jpg", h_cube);
    cv::imwrite("equirectangular.jpg", h_equirect);
    cv::imwrite("denoised.jpg", h_gaussianblur);

    cout << diff.count() << endl;
    // cout << diff.count() << endl;
    // cout << iter/diff.count() << endl;
    
    cv::waitKey();
    
    return 0;
}