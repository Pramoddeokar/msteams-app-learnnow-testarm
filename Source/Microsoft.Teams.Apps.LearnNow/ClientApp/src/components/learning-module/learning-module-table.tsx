// <copyright file="learning-module-table.tsx" company="Microsoft">
// Copyright (c) Microsoft. All rights reserved.
// </copyright>

import * as React from "react";
import { Flex, Text, Table, Image } from "@fluentui/react-northstar";
import CheckboxBase from "./checkbox-base-learning-module";
import { moduleTableStyle } from "../../constants/customize.styled";
import Resources from "../../constants/resources";

import "../../styles/admin-configure-wrapper-page.css";
import "../../styles/learning-module.css";

interface ILearningModuleTableProps {
    showCheckbox: boolean;
    responsesData: any[];
    onCheckBoxChecked: (responseId: string, isChecked: boolean) => void;
    screenWidth: number;
}

/**
 * Component for rendering learning modules collections, used in add to learning module task module.
 */
const LearningModuleTable: React.FunctionComponent<ILearningModuleTableProps> = (props: any) => {
    let UserResponsesTableRows = props.responsesData.map((value: any, index: number) => ({
        key: index,
        styles: moduleTableStyle,
        items: [
            {
                content: (
                    <CheckboxBase
                        checked={value.checkItem === undefined ? false : value.checkItem}
                        onCheckboxChecked={props.onCheckBoxChecked}
                        value={value.id}
                    />
                     
                ),
                className: "table-checkbox-cell-lm",
            },
            {
                content: <Image src={value.imageUrl} className="image-module-style" />,
            },
            {
                content: (
                    <div className="column-style">
                        <Flex>
                            <Flex.Item>
                                <div>
                                    <Flex gap="gap.small">
                                        <Text
                                            className="resource-title"
                                            title={value.title}
                                            content={value.title}
                                            weight="bold"
                                        />
                                    </Flex>
                                    <Flex>
                                        <Text
                                            className="subject-name"
                                            content={value.subject.subjectName }
                                            weight="semibold"
                                        /> |
                                        <Text
                                            className="grade-name"
                                            content={"" + value.grade.gradeName}
                                        />
                                    </Flex>
                                </div>
                            </Flex.Item>
                        </Flex>
                        { props.screenWidth! >= Resources.maxWidthForMobileView ?

                            <Flex>
                                <Text
                                    className="resource-description-table"
                                    title={value.description}
                                    content={value.description}
                                />
                            </Flex>
                            :
                            <Flex></Flex>
                        }
                    </div>
                ),
                className: "resource-data",
            },
        ],
    }));

    /**
     * Renders the component
     */
    return (
        <div>
            <Table rows={UserResponsesTableRows} aria-label="Static headless table" />
        </div>
    );
};

export default LearningModuleTable;
