"""
Lecture du fichier config.yaml à l’intérieur d’un package externe (ex. cortexanalyzer)
"""
from importlib import resources
import yaml

def load_config_yaml(package_name: str, filename: str = "config.yaml") -> dict:
    """
    Essaie d’ouvrir <package_name>/<filename> et renvoie un dict.
    Si le fichier n’existe pas, renvoie {} sans lever d’exception fatale.
    """
    try:
        with resources.files(package_name).joinpath(filename).open("r") as f:
            return yaml.safe_load(f) or {}
    except FileNotFoundError:
        print(f"[config_loader] Aucun {filename} trouvé dans {package_name}")
        return {}
    except Exception as e:
        print(f"[config_loader] Erreur lecture {filename} dans {package_name}: {e}")
        return {}
