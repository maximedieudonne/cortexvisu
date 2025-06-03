---
title: 'CortexVisu: An automatic cortical structures segmentation tools'
tags:
  - Python
  - Java
  - segmentation
  - surface caracterisation
  - computational neuro anatomy
  - cortex

authors:
  - name: Maxime Dieudonné
    orcid: 00009-0005-0113-9463
    affiliation: "1"

affiliations:
  - name: Institut de neuroscience de la Timone, UMR, Marseille, France
    index: 1

date: 16 Juin 2025
bibliography: paper.bib


---

# Summary

CortexVisu is a tools that provide tools for visualising manipulating 3D cortical surface and also that provide automated method to segment 3D cortical surface into corticale surface. It is a convenient implementation of peer reviewed paper for elaborate new sulcal depth method (isbii). CortexVisu leverages mathematical geometric of the surface techniques for analyse the cortical surface. CortexVisu offers both a comand-line interface (CLI) and an API Additionnally, CortexVisu provides one plugins, CortexAnalyser, which facilitate cortical structures segmentation. It is available on Github ().


# Statement of need

Segmenting the cortical surface into relevent cortiale structure is crucial for computation neuro anatomy research. However, challenges arise for clearly defining the different cortical structures. While manual segmentation ensures accuracy, it is labor-intensive and prone to observer variability.

CortexVisu adresses thes challenge with a first segmentation of the the cortex in all cortical sturcture introduced in the litterature. 

A key innovation of CortexVisu is the automatic labeslisation of the differentes cortical structure. An other inoovation is the fact that its works whatever the age and the development stage of the cortex. 

The cortical structure are defined geometrically, with anatomical hypothesis that come frome developement theorie. 

The gyral Crown, the Sulcal wall, the sulcal region. And sub structures : the gyral lips, the gyral net, the wall pinches, the sulcal roots, the annectent gyri.


![alt text](https://github.com/maximedieudonne/cortexvisu/blob/master/asset/screen.JPG)

# State of the field

In a previous study, we evaluate our segmentation compared to the differents methods in the litterature. Our method show significant improvements.


# Software Details

CortexVIsu is composed of two main parts : CortexVisu and CortexAnalyser. The cortexVIsu agorithm is accompanied by a command-line interface (CLI) and a REST API. 



# Acknowledgements
This work was partially funded by 

# References