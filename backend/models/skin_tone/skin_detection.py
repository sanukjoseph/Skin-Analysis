import cv2
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans

pd.options.mode.chained_assignment = None  # default='warn'

# main


def skin_detection(img_path):
    try:
        print(f"Starting skin detection for: {img_path}")
        original = read_image(img_path)
        if original is None:
            # Use cv2 error handling convention if available, otherwise raise ValueError
            # cv2.error might provide more details if the read failed internally
            raise ValueError(f"Could not read image file via cv2: {img_path}")
        print("Image read successfully.")

        try:
            images = image_conversions(original)
            print("Image conversions done.")
        except Exception as e_conv:
            print(f"!!! ERROR during image_conversions: {e_conv}")
            raise e_conv # Re-raise

        try:
            height, width = skin_predict(images)
            print("Skin prediction done.")
        except Exception as e_pred:
            print(f"!!! ERROR during skin_predict: {e_pred}")
            raise e_pred # Re-raise

        try:
            dframe, dframe_removed = dataframe(images)
            print("Dataframe creation done.")
        except Exception as e_df:
            print(f"!!! ERROR during dataframe creation: {e_df}")
            raise e_df # Re-raise

        try:
            # Check if dframe is empty before clustering
            if dframe.empty:
                 raise ValueError("DataFrame for clustering is empty after filtering black pixels.")
            # Update variable name to receive center instead of row
            skin_cluster_center, skin_cluster_label = skin_cluster(dframe)
            print("Skin clustering done.")
        except Exception as e_clust:
            print(f"!!! ERROR during skin_cluster: {e_clust}")
            raise e_clust # Re-raise

        try:
            cluster_label_mat = cluster_matrix(
                dframe, dframe_removed, skin_cluster_label, height, width)
            print("Cluster matrix created.")
        except Exception as e_mat:
            print(f"!!! ERROR during cluster_matrix: {e_mat}")
            raise e_mat # Re-raise

        # Use the returned center
        result = np.delete(skin_cluster_center, -1)
        print(f"Skin detection successful. Result shape: {result.shape}")
        return result
    except Exception as e:
        # This outer catch logs any error from the inner blocks or the initial read
        print(f"!!! OVERALL ERROR in skin_detection for {img_path}: {e}")
        raise e # Re-raise for Flask handler

# display an image plus label and wait for key press to continue


def display_image(image, name):
    window_name = name
    cv2.namedWindow(window_name)
    cv2.imshow(window_name, image)
    cv2.waitKey()
    cv2.destroyAllWindows()

# segment using otsu binarization and thresholding


def thresholding(images):
    histogram, bin_edges = np.histogram(
        images["grayscale"].ravel(), 256, [0, 256])
    Totsu, threshold_image_otsu = cv2.threshold(
        images["grayscale"], 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    Tmax = np.where(histogram[:] == max(histogram[:]))[0][0]
    Tfinal = round((Tmax + Totsu)/2) if Tmax > 10 else round((Tmax + Totsu)/4)

    # plot_histogram(histogram, bin_edges, Totsu, Tmax, Tfinal)

    threshold_type = (cv2.THRESH_BINARY if Tmax <
                      220 else cv2.THRESH_BINARY_INV)
    Tfinal, threshold_image = cv2.threshold(
        images["grayscale"], Tfinal, 255, threshold_type)

    masked_img = cv2.bitwise_and(
        images["BGR"], images["BGR"], mask=threshold_image)
    return masked_img

# Plot Histogram and Threshold values


def plot_histogram(histogram, bin_edges, Totsu, Tmax, Tfinal):
    plt.figure()
    plt.title("Image Histogram")
    plt.xlabel("pixel value")
    plt.ylabel("pixel frequency")
    plt.xlim([0, 256])
    plt.plot(bin_edges[0:-1], histogram)  # <- or here
    plt.axvline(x=Tmax, label="Tmax", color='red', linestyle="--")
    plt.axvline(x=Totsu, label="Totsu", color='green', linestyle="--")
    plt.axvline(x=Tfinal, label="Tfinal", color='yellow', linestyle="-")
    plt.legend()
    plt.show()

# Display all images


def display_all_images(images):
    for key, value in images.items():
        display_image(value, key)

# read in image into openCV


def read_image(dir):
    image_path = dir
    img_BGR = cv2.imread(image_path, 3)
    img_BGR = cv2.resize(img_BGR, (375, 500))
    return img_BGR

# Grayscle and Thresholding and HSV & YCrCb color space conversions


def image_conversions(img_BGR):
    images = {
        "BGR": img_BGR,
        "grayscale": cv2.cvtColor(img_BGR, cv2.COLOR_BGR2GRAY)
    }
    images["thresholded"] = thresholding(images)
    images["HSV"] = cv2.cvtColor(
        images["thresholded"], cv2.COLOR_BGR2HSV)
    images["YCrCb"] = cv2.cvtColor(
        images["thresholded"], cv2.COLOR_BGR2YCrCb)
    return images


# Predict skin pixels
def skin_predict(images):
    height, width = images["grayscale"].shape
    images["skin_predict"] = images["grayscale"]

    for i in range(height):
        for j in range(width):
            if((images["HSV"].item(i, j, 0) <= 170) and (140 <= images["YCrCb"].item(i, j, 1) <= 170) and (90 <= images["YCrCb"].item(i, j, 2) <= 120)):
                images["skin_predict"][i, j] = 255
            else:
                images["skin_predict"][i, j] = 0
    return height, width

# Contruction the dataframe for K-means clustering


def dataframe(images):
    dframe = pd.DataFrame()
    dframe['H'] = images["HSV"].reshape([-1, 3])[:, 0]

    # Getting the y-x coordintated
    # gray = cv2.cvtColor(images["thresholded"], cv2.COLOR_BGR2GRAY)
    # yx_coords = np.column_stack(np.where(gray >= 0))
    # dframe['Y'] = yx_coords[:, 0]
    # dframe['X'] = yx_coords[:, 1]

    dframe['Cr'] = images["YCrCb"].reshape([-1, 3])[:, 1]
    dframe['Cb'] = images["YCrCb"].reshape([-1, 3])[:, 2]
    dframe['I'] = images["skin_predict"].reshape(
        [1, images["skin_predict"].size])[0]

    # Remove Black pixels - which are already segmented
    dframe_removed = dframe[dframe['H'] == 0]
    dframe.drop(dframe[dframe['H'] == 0].index, inplace=True)
    return dframe, dframe_removed

# cluster skin pixels using K-means


def skin_cluster(dframe):
    # Ensure data is float32 for KMeans
    dframe_float = dframe.astype(np.float32)

    # K-means - Use n_init=10 explicitly
    kmeans = KMeans(
        init="random",
        n_clusters=3,
        n_init=10, # Explicitly set n_init=10 (or 'auto' in very new versions)
        max_iter=100,
        random_state=42
    )
    # Fit on the float32 data
    kmeans.fit(dframe_float)

    # Get the skin cluster label - robustly find the index with the highest 'I' value
    km_cc = kmeans.cluster_centers_ # Cluster centers are float64 by default
    if km_cc.shape[0] == 0:
        raise ValueError("KMeans clustering resulted in zero cluster centers.")

    # Find the index (label) of the cluster center with the maximum 'I' value (last column)
    skin_cluster_label = np.argmax(km_cc[:, -1])
    skin_cluster_center = km_cc[skin_cluster_label] # Get the center corresponding to that label

    print(f"Skin cluster label identified: {skin_cluster_label}")
    print(f"Skin cluster center identified: {skin_cluster_center}")


    # Add cluster-label column to the original dataframe (dframe, not dframe_float)
    dframe['cluster'] = kmeans.labels_
    # Return the identified center and its label
    return skin_cluster_center, skin_cluster_label


# Append removed pixels to the dataframe and get cluster matrix
def cluster_matrix(dframe, dframe_removed, skin_cluster_label, height, width):
    dframe_removed['cluster'] = np.full((len(dframe_removed.index), 1), -1)
    dframe = pd.concat([dframe, dframe_removed]).sort_index()
    dframe['cluster'] = (dframe['cluster'] ==
                         skin_cluster_label).astype(int) * 255
    cluster_label_mat = np.asarray(
        dframe['cluster'].values.reshape(height, width), dtype=np.uint8)
    return cluster_label_mat

# final segmentation


def final_segment(images, cluster_label_mat):
    final_segment_img = cv2.bitwise_and(
        images["BGR"], images["BGR"], mask=cluster_label_mat)
    display_image(final_segment_img, "final segmentation")


# print(skin_detection("images\Optimized-selfieNig-cropped.jpg"))
