import React, { useState, useEffect, useContext } from "react";
import { Paper, Tab, Tabs, Button, Box, TextField, CircularProgress } from "@material-ui/core";
import SendRoundedIcon from "@material-ui/icons/SendRounded";
import { withStyles } from "@material-ui/core/styles";
import { useSnackbar } from "notistack";
import { socket } from "service/socket";
import { useParams } from "react-router-dom";
import axios from "axios";
import { SERVER_URL } from "config.keys";
import { SettingContext } from "service/SettingsContext";
import { SettingsContextType } from "types";
import styles from "./InputOutputFile.module.css";
import Loader from "react-loader-spinner";
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";

interface AppProps {
  TextAreaRef: React.RefObject<HTMLDivElement>;
  MonacoEditorRef: React.MutableRefObject<any>;
  rows: number;
}

const CssTextField = withStyles({
  root: {
    // #115293
    padding: "1rem",
    height: "100%",
    width: "100%",
    "& .MuiInputBase-root": {
      outline: "none",
      color: "whitesmoke",
    },
    "& label.Mui-focused": {
      color: "#0055bb",
    },
    "& .MuiInput-underline:after": {
      borderBottomColor: "#0055bb",
    },
    "& .MuiOutlinedInput-root": {
      "& fieldset": {
        borderColor: "#0055bb",
      },
      "&:hover fieldset": {
        borderColor: "#0055bb",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#0055bb",
      },
    },
  },
})(TextField);

const InputOutputFile: React.FC<AppProps> = ({ TextAreaRef, rows, MonacoEditorRef }) => {
  const { id } = useParams<Record<string, string>>();
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [outputData, setOutputData] = useState<Record<string, any>>({
    output: "",
    memory: 1,
    cpuTime: 1,
  });

  const { language } = useContext(SettingContext) as SettingsContextType;
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    socket.on("emit-input-data", (inputData: string) => {
      setInputText(inputData);
    });
    socket.on("emit-code-executed", (outputResponse: Record<string, any>) => {
      enqueueSnackbar(
        outputResponse.memory === null || outputResponse.memory === null
          ? "Error in code-execution"
          : "Code ran successfully",
        {
          variant: outputResponse.memory === null || outputResponse.memory === null ? "error" : "success",
        }
      );
      setOutputData(outputResponse);
      setValue(1);
    });
  }, []);

  const submitProblem = async () => {
    setLoading(true);
    setValue(1);
    const response = await axios({
      method: "POST",
      url: `${SERVER_URL}/api/execute`,
      data: {
        script: MonacoEditorRef.current?.getValue(),
        language: language,
        stdin: inputText,
      },
      responseType: "json",
    });
    socket.emit("code-executed", { data: response.data, roomID: id });
    enqueueSnackbar(
      response.data.memory === null || response.data.memory === null
        ? "Error in code-execution"
        : "Code ran succesfully",
      {
        variant: response.data.memory === null || response.data.memory === null ? "error" : "success",
      }
    );
    setOutputData(response.data);
    setLoading(false);
  };

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  const inputTextFn = (value: string) => {
    setInputText(value);
    socket.emit("input-data", { data: value, roomID: id });
  };

  /**
   * Here we render text area based on index position and additional
   * logic for handling how to display the output on code execution
   * @param index - Tabs Index value 0 from output 1 from input
   */
  const RenderTextArea = ({ index }: { index: number }) => {
    return loading ? (
      <div className={styles.loader}>
        <Loader type="Grid" color="#f5f5f5" height={80} width={80} />
      </div>
    ) : (
      <div
        style={{
          padding: "1rem",
          minHeight: "70%",
          textAlign: "left",
          color: outputData.memory === null || outputData.memory === null ? "#dd2c00" : "inherit",
        }}
      >
        <pre>{outputData.output}</pre>
      </div>
    );
  };

  return (
    <div className={styles.root} ref={TextAreaRef}>
      <Paper className={styles.toolbar}>
        <Tabs
          value={value}
          onChange={(event, value) => handleChange(event, value)}
          indicatorColor="primary"
          textColor="inherit"
          centered
        >
          <Tab label="Input"></Tab>
          <Tab label="Output"></Tab>
        </Tabs>
        <Box className={styles["btn-box"]}>
          <Button
            variant="text"
            color="inherit"
            endIcon={<SendRoundedIcon />}
            onClick={async () => {
              await submitProblem();
            }}
          >
            Run Code
          </Button>
        </Box>
      </Paper>
      <div className={styles["text-area"]}>
        {value === 0 ? (
          <CssTextField
            key="1"
            size="medium"
            variant="outlined"
            value={inputText}
            onChange={(event) => inputTextFn(event.target.value)}
            multiline
            rows={rows}
          />
        ) : (
          <RenderTextArea index={value} />
        )}
      </div>
    </div>
  );
};

export default InputOutputFile;
