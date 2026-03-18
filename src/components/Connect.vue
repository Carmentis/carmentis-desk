<script setup lang="ts">
import {useRoute, useRouter} from "vue-router";
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import {onMounted, ref} from "vue";
import {Responder} from "@cmts-dev/carmentis-relay-client";
const route = useRoute();
const router = useRouter();
const query = route.query;
const symKey: string = query.symKey as string;
const relay: string = query.relay as string;
const sessionId: string = query.sessionId as string;
console.log("Relay: ", relay, symKey, sessionId);
const responder = Responder.create(
    relay,
    sessionId,
    symKey
);

const message = ref('');
function sendMessage() {
  responder.send({ message: message.value, test: 2 })
  message.value = '';
}


responder.onClose(() => {
  console.log("Connection closed");
  router.push('/')
})

responder.onMessage((message) => {
  console.log("Received message:", message);
})

function closeConnect() {
  responder.close();
}

onMounted(async () => {


  console.log("Responder created");
  await responder.join();
  console.log("Sending message")
  await responder.send({ message: "Hello from Vue!" })

})
</script>
<template>
  <Button label="Home" @click="$router.push('/')" />
  Connection attempted {{query}}

  <InputText v-model="message" placeholder="Type a message" />
  <Button label="Send" @click="sendMessage" />
  <Button label="Close" @click="closeConnect" />
</template>