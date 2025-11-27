def test_surface_loading():
    from cortexvisu.parser import load_gii_surface

    coords, faces = load_gii_surface('tests/test_surface.gii')

    assert len(coords) > 0 and len(faces) > 0
