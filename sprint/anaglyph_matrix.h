#include <iostream>
#include <map>


void setAnaglyph(float (&l_mat)[9], float (&r_mat)[9], char* type){
    std::map<std::string, int> ana_type;
    ana_type["true"] = 0;
    ana_type["gray"] = 1;
    ana_type["color"] = 2;
    ana_type["half"] = 3;
    ana_type["optimized"] = 4;

    for (int i=0; i<9; i++){
        l_mat[i] = 0.0;
        r_mat[i] = 0.0;
    }

    
    switch(ana_type[type]){
        case 0:
            l_mat[0] = r_mat[6] = 0.299;
            l_mat[1] = r_mat[7] = 0.587;
            l_mat[2] = r_mat[8] = 0.114;

            break;
        case 1:
            l_mat[0] = r_mat[3] = r_mat[6] = 0.299;
            l_mat[1] = r_mat[4] = r_mat[7] = 0.587;
            l_mat[2] = r_mat[5] = r_mat[8] = 0.114;
            
            break;
        case 2:
            l_mat[0] = r_mat[4] = r_mat[8] = 1.0;
            break;
        case 3:
            l_mat[0] = 0.299;
            l_mat[1] = 0.587;
            l_mat[2] = 0.114;

            r_mat[4] = r_mat[8] = 1.0;
            break;
        case 4:
            l_mat[1] = 0.7;
            l_mat[2] = 0.3;

            r_mat[4] = r_mat[8] = 1.0;
            break;
    };
}