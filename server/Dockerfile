FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py ./

ENV DATA_ROOT=/data
ENV VOS_OIDC_USERINFO_URL=http://172.17.0.1:8105/v1000/oauth2/userinfo

EXPOSE 5000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
