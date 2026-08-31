import * as React from "react";
import type { SVGProps } from "react";

const SvgLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 256 256" {...props}>
    <rect width="256" height="256" rx="58" fill="#6750E8" />
    <path d="M62 42H155L202 89V214H62C51 214 42 205 42 194V62C42 51 51 42 62 42Z" fill="white" />
    <path d="M155 42V76C155 83.18 160.82 89 168 89H202L155 42Z" fill="#3478F6" />
    <path d="M72 104L111.5 188C117.91 201.63 137.09 201.63 143.5 188L184 104H151L127.5 158L104 104H72Z" fill="#6750E8" />
    <path d="M127.5 158L143.5 188C146.2 193.74 151.13 197.08 156.33 198L184 104H151L127.5 158Z" fill="#3478F6" />
  </svg>
);

export default SvgLogo;
