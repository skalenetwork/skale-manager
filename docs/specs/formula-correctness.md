<!-- SPDX-License-Identifier: (AGPL-3.0-only OR CC-BY-4.0) -->

# Formula Correctness

First of all, SKALE Network supposes that all points lie in the affine plane, not projective. In this case, all z-coordinates are equal to zero. Also, if we have point <!-- $A(x_3,y_3,z_3)$ --> <img src="https://render.githubusercontent.com/render/math?math=A(x_3%2Cy_3%2Cz_3)"> in projective plane there is exactly one such point B on affine plane, that corresponds to A, and its coordinates <!-- $B(x_3/z_3^2,y_3/z_3^3)$ --> <img src="https://render.githubusercontent.com/render/math?math=B(x_3%2Fz_3%5E2%2Cy_3%2Fz_3%5E3)">.

Another important thing is that all coordinates are $Fp_2$ points and every coordinate has two other coordinates that are integers modulo 

<!-- $p=21888242871839275222246405745257275088548364400416034343698204186575808495617$ --> <img src="https://render.githubusercontent.com/render/math?math=p%3D21888242871839275222246405745257275088548364400416034343698204186575808495617">

Now, lets follow the algorithm provided by libff and see, that the result is the same.

<!-- $H=x_2 - x_1$ --> <img src="https://render.githubusercontent.com/render/math?math=H%3Dx_2%20-%20x_1">

<!-- $I=4(x_2-x_1)^2$ --> <img src="https://render.githubusercontent.com/render/math?math=I%3D4(x_2-x_1)%5E2">

<!-- $J=H*I=4(x_2-x_1)^3$ --> <img src="https://render.githubusercontent.com/render/math?math=J%3DH*I%3D4(x_2-x_1)%5E3">

<!-- $r=2(s_2-s_1)=2(y_2-y_1)$ --> <img src="https://render.githubusercontent.com/render/math?math=r%3D2(s_2-s_1)%3D2(y_2-y_1)">

<!-- $V=U_1*I=x_1*I=4x_1(x_2-x_1)^2$ --> <img src="https://render.githubusercontent.com/render/math?math=V%3DU_1*I%3Dx_1*I%3D4x_1(x_2-x_1)%5E2">

<!-- $X_3=r^2-J-2V=4(y_2-y_1)^2-4(x_2-x_1)^2-8x_1(x_2-x_1)^2$
$Y_3=r*(V-X_3)-2S_1*J=r*(V-X_3)-2y_1*J=2(y_2-y_1)(4x_1(x_2-x_1)^2-X_3)-8y_1(x_2-x_1)^2$ --> <img src="https://render.githubusercontent.com/render/math?math=X_3%3Dr%5E2-J-2V%3D4(y_2-y_1)%5E2-4(x_2-x_1)%5E2-8x_1(x_2-x_1)%5E2%24%0A%24Y_3%3Dr*(V-X_3)-2S_1*J%3Dr*(V-X_3)-2y_1*J%3D2(y_2-y_1)(4x_1(x_2-x_1)%5E2-X_3)-8y_1(x_2-x_1)%5E2">

<!-- $Z_3=2H=2(x_2-x_1)$ --> <img src="https://render.githubusercontent.com/render/math?math=Z_3%3D2H%3D2(x_2-x_1)">

<!-- $x^*_3=x_3 / Z_3^2=(y_2-y_1/x_2-x_1)^2-(x_2-x_1)-2x_1=(y_2-y_1/x_2-x_1)^2-x_2-x_1$ --> <img src="https://render.githubusercontent.com/render/math?math=x%5E*_3%3Dx_3%20%2F%20Z_3%5E2%3D(y_2-y_1%2Fx_2-x_1)%5E2-(x_2-x_1)-2x_1%3D(y_2-y_1%2Fx_2-x_1)%5E2-x_2-x_1">

<!-- $y^*_3=Y_3/Z_3^3=8x_1(y_2-y_1)(x_2-x_1)^2/8(x_2-x_1)^3-2(y_2-y_1)x_3/Z_3^3-8y_1(x_2-x_1)^3/8(x_2-x_1)^3$ --> <img src="https://render.githubusercontent.com/render/math?math=y%5E*_3%3DY_3%2FZ_3%5E3%3D8x_1(y_2-y_1)(x_2-x_1)%5E2%2F8(x_2-x_1)%5E3-2(y_2-y_1)x_3%2FZ_3%5E3-8y_1(x_2-x_1)%5E3%2F8(x_2-x_1)%5E3">

<!-- $y^*_3=x_1(y_2-y_1)/(x_2-x_1)-x^*_3(y_2-y_1)/(x_2-x_1)-y_1$ --> <img src="https://render.githubusercontent.com/render/math?math=y%5E*_3%3Dx_1(y_2-y_1)%2F(x_2-x_1)-x%5E*_3(y_2-y_1)%2F(x_2-x_1)-y_1">

Here we can see what we got from libff algorithm. Now, let’s follow algorithm from SKALE’s code.

<!-- $s=(y_2-y_1)/(x_2-x_1)$ --> <img src="https://render.githubusercontent.com/render/math?math=s%3D(y_2-y_1)%2F(x_2-x_1)">

<!-- $x_3=s^2-(x_1+x_2)=(y_2-y_1/x_2-x_1)^2-x_1-x_2$ --> <img src="https://render.githubusercontent.com/render/math?math=x_3%3Ds%5E2-(x_1%2Bx_2)%3D(y_2-y_1%2Fx_2-x_1)%5E2-x_1-x_2">

<!-- $y_3=-y_1-s*(x_3-x_1)=s*x_1-s*x_3-y_1=x_1(y_2-y_1/x_2-x_1)-x_3(y_2-y_1/x_2-x_1)-y_1$ --> <img src="https://render.githubusercontent.com/render/math?math=y_3%3D-y_1-s*(x_3-x_1)%3Ds*x_1-s*x_3-y_1%3Dx_1(y_2-y_1%2Fx_2-x_1)-x_3(y_2-y_1%2Fx_2-x_1)-y_1">

As we can see, the result of both algorithms is the same.
