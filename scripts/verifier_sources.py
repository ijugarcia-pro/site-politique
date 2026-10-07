"""Vérifie l'accessibilité de l'archive des scrutins sans la télécharger."""

import httpx

URL = (
    "https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/"
    "Scrutins.json.zip"
)


def main() -> None:
    with httpx.Client(follow_redirects=True, timeout=30) as client:
        reponse = client.head(URL)
        methode = "HEAD"
        if reponse.status_code >= 400 or "content-length" not in reponse.headers:
            reponse = client.get(URL, headers={"Range": "bytes=0-0"})
            methode = "GET partiel"
        taille = reponse.headers.get("content-length")
        if reponse.status_code == 206 and "content-range" in reponse.headers:
            taille = reponse.headers["content-range"].rsplit("/", 1)[-1]
        print(f"Méthode : {methode}")
        print(f"Code HTTP : {reponse.status_code}")
        print(f"Taille : {taille or 'inconnue'} octets")
        print(f"Dernière modification : {reponse.headers.get('last-modified', 'inconnue')}")


if __name__ == "__main__":
    main()
