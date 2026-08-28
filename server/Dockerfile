# Base image reference. Defaults to the upstream image; release builds
# override it with the SWR mirror (ictrek / ictrek-arm orgs).
ARG BASE_IMAGE=python:3.12-slim
FROM ${BASE_IMAGE}

WORKDIR /app

COPY requirements.txt ./

# PyPI index override for mirror-rich environments (defaults to upstream).
ARG PIP_INDEX_URL=https://pypi.org/simple
RUN pip install --no-cache-dir -i "${PIP_INDEX_URL}" -r requirements.txt

COPY main.py ./

ENV DATA_ROOT=/data
ENV VOS_OIDC_USERINFO_URL=http://172.17.0.1:8105/v1000/oauth2/userinfo

EXPOSE 5000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
