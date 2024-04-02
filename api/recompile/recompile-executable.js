import { Router } from 'express';
const router = Router();
import { exec } from 'child_process';

export default router.post('/recompile', (request, response) => {
    const output_directory = `executable`;
    const application_name = `scumchatmonitor`;
    const build_command = `pkg . --output ${output_directory}/${application_name}`;
    exec(build_command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Recompilation error: ${error}`);
            return response.status(500).send(`Recompilation failed`);
        }
        console.log(`Recompilation output: ${stdout}`);
        response.send({message: `The recompilation process has been initiated`});
    });
});
