/**
 * This module must not import anything globally not workin in web-mode! if needed, require it within the functions
 */
import { IConfigParseResult } from '../libs/config-parse-result';
import { IPlugin } from '../libs/plugin';
import { isEnvironment } from './environment-component'
import * as deepmerge from 'deepmerge';
import {PARSER_MODES} from "../libs/parser";

/**
 * Parameters that apply to the whole Plugin, passed by other plugins
 */
export interface IEnvironmentPlugin {

    /**
     * the stage is the environment to apply
     */
    stage: string,

    /**
     * one of the [[PARSER_MODES]]
     */
    parserMode: string
}

/**
 * A Plugin to detect WebApp-Components
 * @param props
 */
export const EnvironmentPlugin = (props: IEnvironmentPlugin): IPlugin => {
    const path = require('path');

    const result: IPlugin = {
        // identify Isomorphic-App-Components
        applies: (component):boolean => {

            return isEnvironment(component);
        },

        // convert the component into configuration parts
        // while the component is of Type `any`, its props must be of type `IWebApp`
        process: (component:any,
                  childConfigs:Array<IConfigParseResult>,
                  infrastructureMode:string | undefined
        ):IConfigParseResult => {

            // when we did not provide a stage, we evaluate all stages, but only with regard to the b
            if (props.stage === undefined) {

                console.log(`No stage specified, load environment ${component.name} in build mode`);

                
                return {
                    slsConfigs: [],
                    webpackConfigs: [],
                    postBuilds: [],
                    environments: [component]
                }
                
            } else if (props.stage !== component.name) {
                // we ignore any environment that does not match the specified one!
                console.log(`environment ${component.name} does not apply to specified ${props.stage}`);
                return {
                    slsConfigs: [],
                    webpackConfigs: [],
                    postBuilds: []
                }
            }

            console.log("apply environment: ", component);

            return {

                slsConfigs: deepmerge.all([
                    {
                        // set the stage-name
                        provider: {
                            STAGE: component.name
                        }
                    },
                    component.offlinePort !== undefined && props.parserMode === PARSER_MODES.MODE_START ? {
                        provider: {
                            PORT: component.offlinePort
                        }
                    } : {},
                    // the stage path is valid only
                    component.stagePath !== undefined && props.parserMode === PARSER_MODES.MODE_DEPLOY ? {
                        provider: {
                            STAGE_PATH: component.name
                        }
                    } : {},
                    component.domain !== undefined ? {
                        plugins: "- serverless-domain-manager",

                        custom: {
                            customDomain: {
                                domainName: component.domain,
                                basePath: '',
                                stage: component.name,
                                createRoute53Record: true
                            }
                        }

                    } : {}
                ]),

                webpackConfigs: [],

                postBuilds: [],
                environments: [component]
            }
        }
    };


    return result;

};