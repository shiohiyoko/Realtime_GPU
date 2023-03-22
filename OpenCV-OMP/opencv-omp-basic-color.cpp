#include <iostream>
#include <opencv2/opencv.hpp>
#include <cmath>
#include <chrono>  // for high_resolution_clock

using namespace std;

int main( int argc, char** argv )
{

  cv::Mat_<cv::Vec3b> source = cv::imread ( argv[1], cv::IMREAD_COLOR);
  cv::Mat_<cv::Vec3b> destination ( source.rows, source.cols );

  cv::imshow("Source Image", source );

  auto begin = chrono::high_resolution_clock::now();
  const int iter = 10;
  const int k = 5;
  const int kd2 = k/2;

  for (int it=0;it<iter;it++)
    {
	 #pragma omp parallel for
      for (int i=kd2;i<source.rows-kd2;i++)
	      for (int j=kd2;j<source.cols-kd2;j++)
          for (int c=0;c<3;c++)
            {
              float filter = 0.0;
              for(int kw=i-kd2; kw<=i+kd2; kw++)
                for(int kh=j-kd2; kh<=j+kd2; kh++)
                  filter += source(kw,kh)[c];
              
              filter /= k*k;
              
	            destination(i,j)[c] = filter;
	            // destination(i,j)[c] = 255.0*cos((255-source(i,j)[c])/255.0);
            }
    }

  auto end = std::chrono::high_resolution_clock::now();
  std::chrono::duration<double> diff = end-begin;

  cv::imshow("Processed Image", destination );

  cout << "Total time: " << diff.count() << " s" << endl;
  cout << "Time for 1 iteration: " << diff.count()/iter << " s" << endl;
  cout << "IPS: " << iter/diff.count() << endl;
  
  cv::waitKey();
  return 0;
}

