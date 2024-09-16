import OpenAI from 'openai'
import {getInputTextFromMessages, getTextContentFromMessage, monitor, tokenCount} from '../dist/index.js'
import "dotenv/config.js";
import { calculateCostChatModel } from '../dist/pricingTable/pricingChatModels.js';
import { describe } from 'node:test';



const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

monitor(openai, {
    metrics_url: process.env.METRICS_URL,
    logs_url: process.env.LOGS_URL,
    metrics_username: Number(process.env.METRICS_USERNAME),
    logs_username: Number(process.env.LOGS_USERNAME),
    access_token: process.env.ACCESS_TOKEN,
    log_prompt: false,
    log_response: false,
    
})

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Does the override of openai.chat.completions.create() work like the original function?', () => {
    

    test('Basic chat completion without streaming response', async () => {
        const result = await openai.chat.completions.create({
            messages: [{ role: 'user', content: "Say this is a test" }],
            model: 'gpt-4o',
        });
        
        expect(
            typeof result.choices[0].message.content
        ).toBe("string");
    });

    test('Chat completion with content array without streaming response', async () => {
        const result = await openai.chat.completions.create({
            messages: [{ role: 'user', content: [
                {
                    type: "text",
                    text: "Say this is a test"
                }
            ] }],
            model: 'gpt-4o',
        });
        
        expect(
            typeof result.choices[0].message.content
        ).toBe("string");
    });

    test('Chat completion with images attached without streaming response', async () => {
        const result = await openai.chat.completions.create({
            messages: [{ role: 'user', content: [
                {
                    type: "image_url",
                    image_url: {
                        "url": "https://www.shutterstock.com/image-vector/google-logo-editorial-vector-symbol-260nw-2317648589.jpg"
                    }
                    
                },
                {
                    type: "text",
                    text: "What logo do you see"
                },
                {
                    type: "image_url",
                    image_url: {
                        "url": "https://www.shutterstock.com/image-vector/google-logo-editorial-vector-symbol-260nw-2317648589.jpg"
                    }
                },
            ] }],
            model: 'gpt-4o',
        });
        
        expect(
            result
                .choices[0]
                .message
                .content
                .toLowerCase()
                .includes("google")
        ).toBe(true);
    });

   
    test('Chat completion with streaming response', async () => {
        const result = await openai.chat.completions.create({
            messages: [{ role: 'user', content: "Say this is a test" }],
            model: 'gpt-4o',
            stream: true
        });
        

        for await(const chunk of result){
            expect(typeof chunk.choices[0].delta.content)
                .toBe("string");
            break
        }
        
    });

    test('Chat completion with long streaming response', async () => {
        const result = await openai.chat.completions.create({
            messages: [{ role: 'user', content: "Tell me a very long story" }],
            model: 'gpt-4o',
            stream: true
        });
        
        let content = ""
        for await(const chunk of result){
            content += chunk.choices[0].delta.content
        }

        expect(
            content.length
        ).toBeGreaterThan(500);

        // how can i increase the timeout time? answer this question


    }, 120000);


    test('Chat completion with multiple messages', async () => {
        let messages = [{ role: 'user', content: "Tell me a very short story" }]
        let tokens1 = tokenCount(
            getTextContentFromMessage(messages[0])
        )

        const result = await openai.chat.completions.create({
            messages: messages,
            model: 'gpt-4o',
            stream: false
        });

        console.log(result.usage)
        
        messages.push(
            result.choices[0].message,
            { role: 'user', content: [
                {
                    type: "text",
                    text: "Do you like your own story?"
                }
            ] }
        )

        const result2 = await openai.chat.completions.create({
            messages: messages,
            model: 'gpt-4o',
            stream: false
        });

        console.log(result2.usage)


        let tokens2 = tokenCount(
            getInputTextFromMessages(messages)
        )

        let cost1 = calculateCostChatModel("gpt-4o", tokens1, 0)
        let cost2 = calculateCostChatModel("gpt-4o", tokens2, 0)

        expect(
            cost1
        ).toBeLessThan(cost2);

        expect(
            tokens1
        ).toBeLessThan(tokens2);

        



        // how can i increase the timeout time? answer this question


    }, 60000);



    afterAll(async () => {
        // Wait for grafana logs and metrics to be sent
        await sleep(1500);
    });

});

