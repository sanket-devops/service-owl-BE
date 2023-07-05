### STAGE 1: Build ###
FROM node:16.15.1-buster

# Install package for Internet speed test
RUN apt update && apt -y upgrade && apt install -y wget sshpass && npm install --location=global fast-cli
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN apt install ./google-chrome-stable_current_amd64.deb -y

# Install Python
RUN apt install software-properties-common -y
RUN wget https://www.python.org/ftp/python/3.11.1/Python-3.11.1.tar.xz
RUN tar -xf Python-3.11.1.tar.xz
RUN cd Python-3.11.1 && ./configure --enable-optimizations && make altinstall

# Install Ansible using Python
RUN python3.11 -m pip install ansible-core==2.12.3
RUN python3.11 -m pip install ansible
COPY ansible.cfg /root/

COPY package*.json /app/
COPY webssh /app/webssh

# Install webssh app dependencies
WORKDIR /app/webssh
RUN python3.11 -m pip install -r requirements.txt --no-cache-dir

# Install service-owl-BE app dependencies
WORKDIR /app
RUN cd /app && npm set progress=false && npm cache clear --force && npm install

COPY . .

# Exposing port
EXPOSE 8002 8888

CMD ./start.sh
# ENTRYPOINT npm run start

## docker file build ##

# docker build -t service-owl-be:latest .

# docker rm -f service-owl-be && docker run --name service-owl-be -p 8002:8002 --net=host service-owl-be:latest

